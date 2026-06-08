import { useState, useRef } from 'react'
import type { Question, Attempt } from '../types'

export interface SessionState {
  sessionId: string | null
  topic_id: string
  questions: Question[]
  attempts: Partial<Attempt>[]
  currentIndex: number
  startTime: number
  questionStartTime: number
  isComplete: boolean
  totalXP: number
}

export function useSession() {
  const [session, setSession] = useState<SessionState | null>(null)
  const timerRef = useRef<number | null>(null)

  function startSession(sessionId: string, topicId: string) {
    setSession({
      sessionId,
      topic_id: topicId,
      questions: [],
      attempts: [],
      currentIndex: 0,
      startTime: Date.now(),
      questionStartTime: Date.now(),
      isComplete: false,
      totalXP: 0,
    })
  }

  function addQuestion(question: Question) {
    setSession(prev => prev ? { ...prev, questions: [...prev.questions, question] } : prev)
  }

  function recordAttempt(attempt: Partial<Attempt>) {
    setSession(prev => {
      if (!prev) return prev
      return {
        ...prev,
        attempts: [...prev.attempts, attempt],
        currentIndex: prev.currentIndex + 1,
        questionStartTime: Date.now(),
        totalXP: (prev.totalXP ?? 0) + (attempt.xp_earned ?? 0),
      }
    })
  }

  function completeSession() {
    setSession(prev => prev ? { ...prev, isComplete: true } : prev)
  }

  function resetSession() {
    if (timerRef.current) clearInterval(timerRef.current)
    setSession(null)
  }

  return { session, startSession, addQuestion, recordAttempt, completeSession, resetSession }
}
