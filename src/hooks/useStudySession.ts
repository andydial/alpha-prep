import { useState, useRef, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { generateQuestion } from '../lib/anthropic'
import { getFallbackQuestion } from '../lib/fallbackQuestions'
import {
  getTopicById,
  getInitialDifficulty, getNextDifficulty, calculateXP, getWeekNumber,
  selectTopicFromDomain,
} from '../lib/curriculum'
import { runSessionEnd } from '../lib/sessionEnd'
import type { Question, Mastery, WeeklyPlan, Domain, DomainPair } from '../types'

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
  activeDomain: Domain
  domainPair: DomainPair
  showStreamTransition: boolean
}

export function useStudySession(
  user: User | null,
  _plan: WeeklyPlan | null,
  domainPair: DomainPair,
  totalQuestions = 40,
) {
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
    activeDomain: domainPair[0],
    domainPair,
    showStreamTransition: false,
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
  const sessionStarted = useRef(false)
  const correctCountRef = useRef(0)
  const totalXPRef = useRef(0)
  const allAttempts = useRef<{ topicId: string; isCorrect: boolean; difficulty: number; timeTaken: number }[]>([])
  const streamBoundary = useRef(20) // questions 1-20 = block 1; 21-40 = block 2

  const fetchNextQuestion = useCallback(async (questionNum: number) => {
    // Determine which stream domain based on question number
    const activeDomain = questionNum <= streamBoundary.current
      ? domainPair[0]
      : domainPair[1]

    setState(prev => ({
      ...prev,
      loading: true,
      answered: false,
      hintUsed: false,
      activeDomain,
    }))

    topicId.current = selectTopicFromDomain(activeDomain, masteryRef.current)
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
  }, [domainPair])

  async function initSession() {
    if (sessionStarted.current) return
    if (!user) return
    sessionStarted.current = true
    try {
      const { data: mastery } = await supabase.from('mastery').select('*').eq('student_id', user.id)
      masteryRef.current = mastery ?? []

      // Initialise difficulty from first domain's representative topic
      const firstTopic = getTopicById(selectTopicFromDomain(domainPair[0], mastery ?? []))
      currentDifficulty.current = getInitialDifficulty(firstTopic?.difficulty_base ?? DIFFICULTY_DEFAULT)
      sessionStartTime.current = Date.now()

      const weekNum = getWeekNumber(EXAM_DATE)
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions').insert({
          student_id: user.id,
          session_type: totalQuestions < 40 ? 'test' : 'practice',
          week_number: weekNum,
        })
        .select().single()
      if (sessionError || !sessionData) throw new Error('Failed to create session')

      sessionIdRef.current = sessionData.id
      setState(prev => ({ ...prev, sessionId: sessionData.id }))
      await fetchNextQuestion(1)
    } catch (err) {
      sessionStarted.current = false  // allow retry if init truly failed
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

    const baseAttempt = {
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
    }
    let { error: attemptError } = await supabase.from('attempts').insert({ ...baseAttempt, xp_earned: xp })
    if (attemptError?.code === '42703') {
      // xp_earned column not yet migrated — insert without it
      ;({ error: attemptError } = await supabase.from('attempts').insert(baseAttempt))
    }
    if (attemptError) console.error('[handleAnswer] attempt insert failed:', attemptError)
  }

  async function finishSession() {
    const durationSeconds = Math.round((Date.now() - sessionStartTime.current) / 1000)
    if (sessionIdRef.current) {
      const coreUpdate = {
        completed_at: new Date().toISOString(),
        total_questions: totalQuestions,
        correct_count: correctCountRef.current,
        duration_seconds: durationSeconds,
      }
      let { error: sessionUpdateError } = await supabase.from('sessions').update({
        ...coreUpdate,
        xp_earned: totalXPRef.current,
      }).eq('id', sessionIdRef.current)
      if (sessionUpdateError?.code === '42703') {
        // xp_earned column not yet migrated — update without it
        ;({ error: sessionUpdateError } = await supabase.from('sessions').update(coreUpdate).eq('id', sessionIdRef.current))
      }
      if (sessionUpdateError) console.error('[finishSession] session update failed:', sessionUpdateError)
    }
    const topicNames = [...topicsUsed.current].map(id => getTopicById(id)?.name ?? id)

    // Default payload (used if user is null or sessionEnd fails)
    let sessionPayload: Record<string, unknown> = {
      sessionId: sessionIdRef.current,
      correctCount: correctCountRef.current,
      totalQuestions: totalQuestions,
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
    if (questionNumber >= totalQuestions) {
      await finishSession()
      return true // signals navigate to results
    }
    const nextNum = questionNumber + 1
    if (questionNumber === streamBoundary.current) {
      // Crossing from stream 1 to stream 2 — show transition screen instead of fetching
      setState(prev => ({ ...prev, questionNumber: nextNum, showStreamTransition: true }))
      return false
    }
    setState(prev => ({ ...prev, questionNumber: nextNum }))
    await fetchNextQuestion(nextNum)
    return false
  }

  async function dismissTransition() {
    setState(prev => ({ ...prev, showStreamTransition: false }))
    await fetchNextQuestion(streamBoundary.current + 1)
  }

  return { state, initSession, handleAnswer, handleNext, setHintUsed, dismissTransition, QUESTIONS_PER_SESSION: totalQuestions }
}
