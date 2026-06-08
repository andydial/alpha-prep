import { useState, useRef, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { generateQuestion } from '../lib/anthropic'
import { getFallbackQuestion } from '../lib/fallbackQuestions'
import {
  selectTopicForSession, getTopicById,
  getInitialDifficulty, getNextDifficulty, calculateXP, getWeekNumber,
} from '../lib/curriculum'
import { runSessionEnd } from '../lib/sessionEnd'
import type { Question, Mastery, WeeklyPlan } from '../types'

const QUESTIONS_PER_SESSION = 15
const EXAM_DATE = new Date('2026-08-14')
const DIFFICULTY_DEFAULT = 6

function normalise(s: string) {
  return s.toLowerCase().replace(/^[a-d]\)\s*/i, '').trim()
}

export function checkAnswer(student: string, correct: string): boolean {
  return normalise(student) === normalise(correct)
}

export interface StudySessionState {
  sessionId: string | null
  currentQuestion: Question | null
  answered: boolean
  isCorrect: boolean
  xpEarned: number
  hintUsed: boolean
  showXPFlash: boolean
  questionNumber: number
  loading: boolean
  error: string | null
  totalXP: number
  correctCount: number
}

export function useStudySession(user: User | null, plan: WeeklyPlan | null) {
  const [state, setState] = useState<StudySessionState>({
    sessionId: null,
    currentQuestion: null,
    answered: false,
    isCorrect: false,
    xpEarned: 0,
    hintUsed: false,
    showXPFlash: false,
    questionNumber: 1,
    loading: true,
    error: null,
    totalXP: 0,
    correctCount: 0,
  })

  const sessionStartTime = useRef(0)
  const questionStartTime = useRef(0)
  const previousQuestions = useRef<string[]>([])
  const recentResults = useRef<boolean[]>([])
  const currentDifficulty = useRef(DIFFICULTY_DEFAULT)
  const topicId = useRef('maths_fractions')
  const masteryRef = useRef<Mastery[]>([])
  const topicsUsed = useRef<Set<string>>(new Set())
  const sessionIdRef = useRef<string | null>(null)
  const correctCountRef = useRef(0)
  const totalXPRef = useRef(0)
  const allAttempts = useRef<{ topicId: string; isCorrect: boolean; difficulty: number; timeTaken: number }[]>([])

  const fetchNextQuestion = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, answered: false, hintUsed: false }))
    const topic = getTopicById(topicId.current)
    const weekNum = getWeekNumber(EXAM_DATE)
    try {
      const q = await generateQuestion({
        topicId: topicId.current,
        topicName: topic?.name ?? topicId.current,
        difficulty: currentDifficulty.current,
        previousQuestions: previousQuestions.current,
        weekNumber: weekNum,
      })
      previousQuestions.current.push(q.question.slice(0, 80))
      topicsUsed.current.add(q.topic_id)
      questionStartTime.current = Date.now()
      setState(prev => ({ ...prev, currentQuestion: q, loading: false }))
    } catch {
      const fallback = getFallbackQuestion(topicId.current)
      topicsUsed.current.add(fallback.topic_id)
      questionStartTime.current = Date.now()
      setState(prev => ({ ...prev, currentQuestion: fallback, loading: false }))
    }
  }, [])

  async function initSession() {
    if (!user) return
    try {
      const { data: mastery } = await supabase.from('mastery').select('*').eq('student_id', user.id)
      masteryRef.current = mastery ?? []
      topicId.current = selectTopicForSession(masteryRef.current, plan)
      const topic = getTopicById(topicId.current)
      currentDifficulty.current = getInitialDifficulty(topic?.difficulty_base ?? DIFFICULTY_DEFAULT)
      sessionStartTime.current = Date.now()

      const weekNum = getWeekNumber(EXAM_DATE)
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions').insert({ student_id: user.id, session_type: 'practice', week_number: weekNum })
        .select().single()
      if (sessionError || !sessionData) throw new Error('Failed to create session')

      sessionIdRef.current = sessionData.id
      setState(prev => ({ ...prev, sessionId: sessionData.id }))
      await fetchNextQuestion()
    } catch (err) {
      console.error(err)
      setState(prev => ({ ...prev, error: 'Could not start session. Please try again.', loading: false }))
    }
  }

  async function handleAnswer(studentAnswer: string, currentQuestion: Question) {
    if (!user) return
    const correct = checkAnswer(studentAnswer, currentQuestion.correct_answer)
    const xp = calculateXP(correct, currentQuestion.difficulty, state.hintUsed)

    const timeTaken = Math.round((Date.now() - questionStartTime.current) / 1000)
    if (correct) correctCountRef.current += 1
    totalXPRef.current += xp
    recentResults.current.push(correct)
    allAttempts.current.push({
      topicId: currentQuestion.topic_id,
      isCorrect: correct,
      difficulty: currentQuestion.difficulty,
      timeTaken,
    })
    currentDifficulty.current = getNextDifficulty(currentDifficulty.current, recentResults.current)

    setState(prev => ({
      ...prev,
      answered: true,
      isCorrect: correct,
      xpEarned: xp,
      showXPFlash: correct,
      totalXP: totalXPRef.current,
      correctCount: correctCountRef.current,
    }))
    if (correct) setTimeout(() => setState(prev => ({ ...prev, showXPFlash: false })), 1600)

    try {
      await supabase.from('attempts').insert({
        session_id: sessionIdRef.current,
        student_id: user.id,
        topic_id: currentQuestion.topic_id,
        question_text: currentQuestion.question,
        question_type: currentQuestion.type,
        options: currentQuestion.options,
        correct_answer: currentQuestion.correct_answer,
        student_answer: studentAnswer,
        is_correct: correct,
        difficulty: currentQuestion.difficulty,
        time_seconds: timeTaken,
        ai_explanation: currentQuestion.explanation,
        hint_used: state.hintUsed,
        xp_earned: xp,
      })
    } catch (err) { console.error('Failed to save attempt:', err) }
  }

  async function finishSession() {
    const durationSeconds = Math.round((Date.now() - sessionStartTime.current) / 1000)
    if (sessionIdRef.current) {
      try {
        await supabase.from('sessions').update({
          completed_at: new Date().toISOString(),
          total_questions: QUESTIONS_PER_SESSION,
          correct_count: correctCountRef.current,
          xp_earned: totalXPRef.current,
          duration_seconds: durationSeconds,
        }).eq('id', sessionIdRef.current)
      } catch (err) { console.error('Failed to update session:', err) }
    }
    const topicNames = [...topicsUsed.current].map(id => getTopicById(id)?.name ?? id)

    // Default payload (used if user is null or sessionEnd fails)
    let sessionPayload: Record<string, unknown> = {
      sessionId: sessionIdRef.current,
      correctCount: correctCountRef.current,
      totalQuestions: QUESTIONS_PER_SESSION,
      xpEarned: totalXPRef.current,
      durationSeconds,
      topicNames,
      newXPTotal: totalXPRef.current,
      newLevel: 1,
      leveledUp: false,
      newStreak: 1,
      badgesEarned: [],
    }

    if (user && sessionIdRef.current) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('xp_total, level, streak_current, last_session_date')
          .eq('id', user.id)
          .single()

        const sessionEndResult = await runSessionEnd({
          studentId: user.id,
          sessionId: sessionIdRef.current,
          attempts: allAttempts.current,
          xpEarned: totalXPRef.current,
          currentXPTotal: profile?.xp_total ?? 0,
          currentStreak: profile?.streak_current ?? 0,
          lastSessionDate: profile?.last_session_date ?? null,
        })

        sessionPayload = {
          ...sessionPayload,
          newXPTotal: sessionEndResult.newXPTotal,
          newLevel: sessionEndResult.newLevel,
          leveledUp: sessionEndResult.leveledUp,
          newStreak: sessionEndResult.newStreak,
          badgesEarned: sessionEndResult.badgesEarned,
        }
      } catch (err) {
        console.error('Failed to run session end:', err)
      }
    }

    sessionStorage.setItem('lastSessionResult', JSON.stringify(sessionPayload))
  }

  function setHintUsed() {
    setState(prev => ({ ...prev, hintUsed: true }))
  }

  async function handleNext(questionNumber: number): Promise<boolean> {
    if (questionNumber >= QUESTIONS_PER_SESSION) {
      await finishSession()
      return true // signals navigate to results
    }
    setState(prev => ({ ...prev, questionNumber: prev.questionNumber + 1 }))
    await fetchNextQuestion()
    return false
  }

  return { state, initSession, handleAnswer, handleNext, setHintUsed, QUESTIONS_PER_SESSION }
}
