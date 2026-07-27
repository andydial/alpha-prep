/**
 * ParentReport — parent-only view, organised around the list of study sessions.
 *
 * Every completed session is listed with the time spent and the number of questions
 * attempted; each row opens /report/session/:id for the per-topic breakdown and the
 * questions Aarav got wrong. Long-run mastery data sits in a collapsed section below.
 *
 * ACCESS: the parent account needs SELECT on sessions, attempts, mastery,
 * weekly_plans and student_badges. Run db/parent_read_policies.sql in the Supabase
 * SQL Editor if data is missing.
 */

import { useState } from 'react'
import { useUser } from '../hooks/useUser'
import { useParentReport } from '../hooks/useParentReport'
import { getDaysUntilExam, getWeekNumber } from '../lib/curriculum'
import { formatDuration } from '../lib/formatters'
import { SessionList } from '../components/parent/SessionList'
import { OverallProgress } from '../components/parent/OverallProgress'

const EXAM_DATE = new Date('2026-08-14')

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 print:text-gray-600">
      {children}
    </h2>
  )
}

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center print:border-gray-300 print:bg-white">
      <p className="text-gray-400 text-xs mb-1 print:text-gray-500">{label}</p>
      <p className="text-white font-bold text-2xl print:text-gray-900">{value}</p>
      {sub && <p className="text-gray-500 text-xs mt-0.5 print:text-gray-400">{sub}</p>}
    </div>
  )
}

export function ParentReport() {
  const { user, profile } = useUser()
  const { sessions, mastery, badges, attemptsBlocked, loading } = useParentReport(user?.id)
  const [showProgress, setShowProgress] = useState(false)

  const daysLeft = getDaysUntilExam(EXAM_DATE)
  const weekNumber = getWeekNumber(EXAM_DATE)

  const totalQuestions = sessions.reduce((n, s) => n + s.attempted, 0)
  const totalCorrect = sessions.reduce((n, s) => n + s.correct, 0)
  const totalSeconds = sessions.reduce((n, s) => n + (s.duration_seconds ?? 0), 0)
  const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : null

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 p-6">
        <div className="max-w-2xl mx-auto space-y-4 animate-pulse">
          <div className="h-10 bg-gray-800 rounded w-56" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-900 rounded-2xl" />)}
          </div>
          <div className="h-80 bg-gray-900 rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 print:bg-white print:text-gray-900">
      <div className="max-w-2xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between print:border-b print:border-gray-200 print:pb-4">
          <div>
            <h1 className="text-2xl font-bold text-white print:text-gray-900">Parent Report</h1>
            <p className="text-gray-400 text-sm mt-1 print:text-gray-500">
              Alpha Prep — EDSC exam in {daysLeft} days (Week {weekNumber} of 8)
            </p>
            <p className="text-gray-500 text-xs mt-0.5 print:text-gray-400">
              Generated {new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className="hidden sm:inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg px-3 py-1.5 transition-colors print:hidden"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print
          </button>
        </div>

        {sessions.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-10 text-center print:border-gray-200">
            <p className="text-gray-400 text-sm">No session data available yet.</p>
            <p className="text-gray-600 text-xs mt-2 leading-relaxed">
              If Aarav has completed sessions but they are not showing here, run{' '}
              <code className="text-gray-500">db/parent_read_policies.sql</code> in the Supabase
              SQL Editor, then refresh this page.
            </p>
          </div>
        ) : (
          <>
            {/* Summary */}
            <section>
              <SectionHeading>Overall Summary</SectionHeading>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatTile label="Sessions" value={String(sessions.length)} />
                <StatTile label="Questions" value={String(totalQuestions)} sub="attempted" />
                <StatTile label="Accuracy" value={accuracy !== null ? `${accuracy}%` : '—'} sub="all time" />
                <StatTile label="Study time" value={formatDuration(totalSeconds)} sub="total" />
              </div>
            </section>

            {/* All sessions — the main event */}
            <section>
              <SectionHeading>All Sessions ({sessions.length})</SectionHeading>
              {attemptsBlocked && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl px-5 py-3 mb-3 print:hidden">
                  <p className="text-amber-300 text-xs leading-relaxed">
                    Question-level data could not be read, so counts below fall back to the planned
                    session totals and the drill-down will be empty. Run{' '}
                    <code>db/parent_read_policies.sql</code> in the Supabase SQL Editor to fix this.
                  </p>
                </div>
              )}
              <p className="text-gray-500 text-xs mb-3 print:hidden">
                Tap a session to see the topic breakdown and the questions Aarav got wrong.
              </p>
              <SessionList sessions={sessions} />
            </section>

            {/* Long-run progress — collapsed by default, always expanded when printing */}
            <section>
              <button
                onClick={() => setShowProgress(prev => !prev)}
                className="flex items-center gap-2 text-sm font-semibold text-gray-300 hover:text-white transition-colors print:hidden"
              >
                <span className={`text-gray-600 transition-transform ${showProgress ? 'rotate-90' : ''}`}>▸</span>
                Overall progress — mastery, domains, badges
              </button>
              <div className={showProgress ? '' : 'hidden print:block'}>
                <OverallProgress mastery={mastery} badges={badges} />
              </div>
            </section>

            {/* Supervisor note */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-4 text-xs text-gray-500 print:border-gray-200 print:bg-gray-50">
              <strong className="text-gray-400 print:text-gray-600">Note for {profile?.display_name ?? 'parent'}:</strong>{' '}
              Question counts are taken from Aarav's saved answers, so a session he exited early
              shows what he actually attempted rather than the planned total.
            </div>
          </>
        )}

        <div className="h-4 print:hidden" />
      </div>
    </div>
  )
}
