import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Session, Mastery, StudentBadge } from '../types'

/**
 * A session row enriched with the counts derived from its actual attempt rows.
 *
 * `sessions.total_questions` stores the *planned* question count, so a session
 * abandoned early still records the full target. `attempted` / `correct` below are
 * counted from the `attempts` table and are what the parent views display.
 */
export interface SessionSummary extends Session {
  attempted: number
  correct: number
  accuracy: number | null
}

interface UseParentReportResult {
  sessions: SessionSummary[]
  mastery: Mastery[]
  badges: StudentBadge[]
  /** True when sessions loaded but no attempt rows were readable — usually missing RLS. */
  attemptsBlocked: boolean
  loading: boolean
}

/** PostgREST caps a single response (Supabase default is 1000 rows), so page through. */
const PAGE_SIZE = 1000

async function fetchAllAttemptTallies(parentId: string) {
  const rows: { session_id: string | null; is_correct: boolean | null }[] = []
  for (let page = 0; ; page++) {
    const { data, error } = await supabase
      .from('attempts')
      .select('session_id, is_correct')
      .neq('student_id', parentId)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
    if (error) {
      console.error('[useParentReport] attempts fetch failed:', error)
      break
    }
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE_SIZE) break
  }
  return rows
}

/**
 * Loads everything the parent report needs for the student.
 *
 * Rows belonging to the parent's own account are excluded — the parent's test runs
 * are not part of Aarav's record. Sessions are NOT filtered by `session_type`:
 * useStudySession tags any session under 40 questions as 'test', so filtering it
 * out would hide every quick, single-domain and topic-drill session.
 */
export function useParentReport(parentId: string | undefined): UseParentReportResult {
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [mastery, setMastery] = useState<Mastery[]>([])
  const [badges, setBadges] = useState<StudentBadge[]>([])
  const [attemptsBlocked, setAttemptsBlocked] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!parentId) return
    let cancelled = false

    async function load(id: string) {
      setLoading(true)
      try {
        const [sessRes, mastRes, badgeRes, attemptRows] = await Promise.all([
          supabase
            .from('sessions')
            .select('*')
            .neq('student_id', id)
            .not('completed_at', 'is', null)
            .order('started_at', { ascending: false }),
          supabase
            .from('mastery')
            .select('*')
            .neq('student_id', id)
            .order('score_alltime', { ascending: true }),
          supabase
            .from('student_badges')
            .select('*, badge:badges(*)')
            .neq('student_id', id)
            .order('earned_at', { ascending: false }),
          fetchAllAttemptTallies(id),
        ])
        if (cancelled) return

        const tallies = new Map<string, { attempted: number; correct: number }>()
        for (const row of attemptRows) {
          if (!row.session_id) continue
          const t = tallies.get(row.session_id) ?? { attempted: 0, correct: 0 }
          t.attempted += 1
          if (row.is_correct) t.correct += 1
          tallies.set(row.session_id, t)
        }

        const sessionRows = (sessRes.data ?? []) as Session[]
        setSessions(sessionRows.map(s => summarise(s, tallies.get(s.id))))
        setMastery((mastRes.data ?? []) as Mastery[])
        setBadges((badgeRes.data ?? []) as StudentBadge[])
        setAttemptsBlocked(sessionRows.length > 0 && attemptRows.length === 0)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load(parentId)
    return () => { cancelled = true }
  }, [parentId])

  return { sessions, mastery, badges, attemptsBlocked, loading }
}

/** Prefer counts derived from attempt rows; fall back to the stored session totals. */
function summarise(s: Session, tally?: { attempted: number; correct: number }): SessionSummary {
  const attempted = tally?.attempted ?? s.total_questions ?? 0
  const correct = tally?.correct ?? s.correct_count ?? 0
  return {
    ...s,
    attempted,
    correct,
    accuracy: attempted > 0 ? Math.round((correct / attempted) * 100) : null,
  }
}
