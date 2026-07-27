/**
 * ParentSessionDetail — one study session, opened from the session list on /report.
 *
 * Shows how many questions were attempted per subject and topic, and then every
 * question Aarav got wrong with his answer beside the correct one, so the two of
 * them can work through the mistakes together.
 */

import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatDuration, formatFullDateTime, accuracyColour } from '../lib/formatters'
import { SessionTopicBreakdown } from '../components/parent/SessionTopicBreakdown'
import { MistakeCard } from '../components/parent/MistakeCard'
import type { Session, Attempt } from '../types'

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 print:text-gray-600">
      {children}
    </h2>
  )
}

function StatTile({ label, value, valueClass = 'text-white' }: {
  label: string; value: string; valueClass?: string
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center print:border-gray-300 print:bg-white">
      <p className="text-gray-400 text-xs mb-1 print:text-gray-500">{label}</p>
      <p className={`font-bold text-2xl ${valueClass} print:text-gray-900`}>{value}</p>
    </div>
  )
}

export function ParentSessionDetail() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const [session, setSession] = useState<Session | null>(null)
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!sessionId) return
    let cancelled = false

    async function load(id: string) {
      setLoading(true)
      try {
        const [sessRes, attemptRes] = await Promise.all([
          supabase.from('sessions').select('*').eq('id', id).maybeSingle(),
          supabase.from('attempts').select('*').eq('session_id', id)
            .order('attempted_at', { ascending: true }),
        ])
        if (cancelled) return
        if (sessRes.error) console.error('[ParentSessionDetail] session fetch failed:', sessRes.error)
        if (attemptRes.error) console.error('[ParentSessionDetail] attempts fetch failed:', attemptRes.error)
        setSession((sessRes.data ?? null) as Session | null)
        setAttempts((attemptRes.data ?? []) as Attempt[])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load(sessionId)
    return () => { cancelled = true }
  }, [sessionId])

  const attempted = attempts.length
  const correct = attempts.filter(a => a.is_correct).length
  const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : null
  const mistakes = attempts.filter(a => !a.is_correct)

  const backLink = (
    <Link to="/report" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors print:hidden">
      <span>‹</span> All sessions
    </Link>
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 p-6">
        <div className="max-w-2xl mx-auto space-y-4 animate-pulse">
          <div className="h-8 bg-gray-800 rounded w-64" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-900 rounded-2xl" />)}
          </div>
          <div className="h-64 bg-gray-900 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-950 p-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {backLink}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-10 text-center">
            <p className="text-gray-400 text-sm">That session could not be found.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 print:bg-white print:text-gray-900">
      <div className="max-w-2xl mx-auto space-y-8">

        {/* Header */}
        <div>
          {backLink}
          <h1 className="text-2xl font-bold text-white mt-2 print:text-gray-900">Session detail</h1>
          <p className="text-gray-400 text-sm mt-1 print:text-gray-500">
            {formatFullDateTime(session.started_at)} · {formatDuration(session.duration_seconds)}
          </p>
        </div>

        {attempted === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-10 text-center print:border-gray-200">
            <p className="text-gray-400 text-sm">No saved answers for this session.</p>
            <p className="text-gray-600 text-xs mt-2 leading-relaxed">
              Either the session was exited before the first answer, or the parent account cannot
              read the <code className="text-gray-500">attempts</code> table — run{' '}
              <code className="text-gray-500">db/parent_read_policies.sql</code> in the Supabase
              SQL Editor if you expected data here.
            </p>
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatTile label="Attempted" value={String(attempted)} />
              <StatTile label="Correct" value={String(correct)} />
              <StatTile
                label="Accuracy"
                value={accuracy !== null ? `${accuracy}%` : '—'}
                valueClass={accuracy !== null ? accuracyColour(accuracy) : 'text-white'}
              />
              <StatTile label="Time spent" value={formatDuration(session.duration_seconds)} />
            </div>

            {/* Per subject / topic */}
            <section>
              <SectionHeading>By Subject &amp; Topic</SectionHeading>
              <SessionTopicBreakdown attempts={attempts} />
            </section>

            {/* Mistakes */}
            <section>
              <SectionHeading>
                {mistakes.length === 0 ? 'Mistakes' : `Mistakes (${mistakes.length})`}
              </SectionHeading>
              {mistakes.length === 0 ? (
                <div className="bg-green-500/10 border border-green-500/25 rounded-2xl p-8 text-center print:border-gray-200 print:bg-white">
                  <p className="text-green-300 text-sm font-medium print:text-gray-700">
                    Clean sweep — every question correct in this session.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {mistakes.map(a => (
                    <MistakeCard
                      key={a.id}
                      attempt={a}
                      index={attempts.indexOf(a) + 1}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        <div className="h-4 print:hidden" />
      </div>
    </div>
  )
}
