/**
 * ParentReport — a parent-only view of the student's full progress.
 *
 * RLS NOTE: Run the following SQL in the Supabase SQL Editor so the parent
 * account can read the student's data. The profiles.role column must be 'parent'
 * for the parent user (set this via: update public.profiles set role = 'parent' where id = '<parent-uuid>').
 *
 *   create policy "parent reads sessions"
 *     on public.sessions for select
 *     using (exists (
 *       select 1 from public.profiles
 *       where id = auth.uid() and role = 'parent'
 *     ));
 *
 *   create policy "parent reads attempts"
 *     on public.attempts for select
 *     using (exists (
 *       select 1 from public.profiles
 *       where id = auth.uid() and role = 'parent'
 *     ));
 *
 *   create policy "parent reads mastery"
 *     on public.mastery for select
 *     using (exists (
 *       select 1 from public.profiles
 *       where id = auth.uid() and role = 'parent'
 *     ));
 *
 *   create policy "parent reads weekly_plans"
 *     on public.weekly_plans for select
 *     using (exists (
 *       select 1 from public.profiles
 *       where id = auth.uid() and role = 'parent'
 *     ));
 *
 *   create policy "parent reads student_badges"
 *     on public.student_badges for select
 *     using (exists (
 *       select 1 from public.profiles
 *       where id = auth.uid() and role = 'parent'
 *     ));
 *
 * Until those policies are in place the tables return empty arrays for the parent.
 */

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useUser } from '../hooks/useUser'
import { TOPICS, getTopicById, getDaysUntilExam, getWeekNumber } from '../lib/curriculum'
import { TopicMasteryBar } from '../components/TopicMasteryBar'
import type { Session, Mastery, StudentBadge } from '../types'

const EXAM_DATE = new Date('2026-08-14')

interface AggregateStats {
  totalSessions: number
  totalQuestions: number
  totalCorrect: number
  totalStudySeconds: number
  totalXP: number
  overallAccuracy: number | null
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

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
  const [sessions, setSessions] = useState<Session[]>([])
  const [mastery, setMastery] = useState<Mastery[]>([])
  const [badges, setBadges] = useState<StudentBadge[]>([])
  const [loading, setLoading] = useState(true)

  const daysLeft = getDaysUntilExam(EXAM_DATE)
  const weekNumber = getWeekNumber(EXAM_DATE)

  useEffect(() => {
    if (!user?.id) return
    const parentId = user.id
    async function load() {
      setLoading(true)
      try {
        // Exclude the parent's own rows (test sessions) — show only the student's data.
        // Requires parent RLS policies — see file header.
        const [sessRes, mastRes, badgeRes] = await Promise.all([
          supabase
            .from('sessions')
            .select('*')
            .neq('student_id', parentId)
            .not('completed_at', 'is', null)
            .neq('session_type', 'test')
            .order('started_at', { ascending: false }),
          supabase
            .from('mastery')
            .select('*')
            .neq('student_id', parentId)
            .order('score_alltime', { ascending: true }),
          supabase
            .from('student_badges')
            .select('*, badge:badges(*)')
            .neq('student_id', parentId)
            .order('earned_at', { ascending: false }),
        ])
        setSessions((sessRes.data ?? []) as Session[])
        setMastery((mastRes.data ?? []) as Mastery[])
        setBadges((badgeRes.data ?? []) as StudentBadge[])
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [user?.id])

  // Aggregate stats
  const stats: AggregateStats = sessions.reduce<AggregateStats>(
    (acc, s) => ({
      totalSessions: acc.totalSessions + 1,
      totalQuestions: acc.totalQuestions + (s.total_questions ?? 0),
      totalCorrect: acc.totalCorrect + (s.correct_count ?? 0),
      totalStudySeconds: acc.totalStudySeconds + (s.duration_seconds ?? 0),
      totalXP: acc.totalXP + (s.xp_earned ?? 0),
      overallAccuracy: null, // computed after
    }),
    { totalSessions: 0, totalQuestions: 0, totalCorrect: 0, totalStudySeconds: 0, totalXP: 0, overallAccuracy: null }
  )
  stats.overallAccuracy =
    stats.totalQuestions > 0
      ? Math.round((stats.totalCorrect / stats.totalQuestions) * 100)
      : null

  // Topics sorted: lowest mastery first
  const masteryMap = Object.fromEntries(mastery.map(m => [m.topic_id, m]))
  const allTopicsWithData = TOPICS.map(t => ({
    topic: t,
    m: masteryMap[t.id] ?? null,
  }))

  // Domain summary
  const domains = ['maths', 'reading', 'verbal', 'abstract', 'writing'] as const
  const domainSummary = domains.map(d => {
    const topicRows = allTopicsWithData.filter(x => x.topic.domain === d && x.m && x.m.attempts_total > 0)
    if (topicRows.length === 0) return { domain: d, avg: null }
    const avg = topicRows.reduce((sum, x) => sum + (x.m?.score_alltime ?? 0), 0) / topicRows.length
    return { domain: d, avg: Math.round(avg * 100) }
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 p-6">
        <div className="max-w-2xl mx-auto space-y-4 animate-pulse">
          <div className="h-10 bg-gray-800 rounded w-56" />
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-900 rounded-2xl" />)}
          </div>
          <div className="h-64 bg-gray-900 rounded-2xl" />
        </div>
      </div>
    )
  }

  const noData = sessions.length === 0

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 print:bg-white print:text-gray-900">
      <div className="max-w-2xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between print:border-b print:border-gray-200 print:pb-4">
          <div>
            <h1 className="text-2xl font-bold text-white print:text-gray-900">
              Parent Report
            </h1>
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

        {noData ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-10 text-center print:border-gray-200">
            <p className="text-gray-400 text-sm">No session data available yet.</p>
            <p className="text-gray-600 text-xs mt-2 leading-relaxed">
              If Aarav has completed sessions but they are not showing here, run the five RLS policies
              from the comment at the top of <code className="text-gray-500">ParentReport.tsx</code> in
              the Supabase SQL Editor, then refresh this page.
            </p>
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <section>
              <SectionHeading>Overall Summary</SectionHeading>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatTile label="Sessions" value={String(stats.totalSessions)} />
                <StatTile label="Questions" value={String(stats.totalQuestions)} />
                <StatTile
                  label="Accuracy"
                  value={stats.overallAccuracy !== null ? `${stats.overallAccuracy}%` : '—'}
                  sub="all time"
                />
                <StatTile
                  label="Study time"
                  value={formatDuration(stats.totalStudySeconds)}
                  sub="total"
                />
              </div>
            </section>

            {/* Domain breakdown */}
            <section>
              <SectionHeading>Domain Scores</SectionHeading>
              <div className="bg-gray-900 border border-gray-800 rounded-2xl px-5 py-4 space-y-2 print:border-gray-200 print:bg-white">
                {domainSummary.map(({ domain, avg }) => (
                  <div key={domain} className="flex items-center gap-3">
                    <span className="w-20 text-sm text-gray-300 capitalize">{domain}</span>
                    {avg === null ? (
                      <span className="text-gray-600 text-xs">No data</span>
                    ) : (
                      <>
                        <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden print:bg-gray-200">
                          <div
                            className={`h-2 rounded-full ${
                              avg < 50 ? 'bg-red-500' : avg < 75 ? 'bg-amber-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${avg}%` }}
                          />
                        </div>
                        <span
                          className={`w-10 text-right text-sm font-semibold ${
                            avg < 50 ? 'text-red-400' : avg < 75 ? 'text-amber-400' : 'text-green-400'
                          }`}
                        >
                          {avg}%
                        </span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Topic Mastery breakdown */}
            <section>
              <SectionHeading>Topic Mastery</SectionHeading>
              <div className="bg-gray-900 border border-gray-800 rounded-2xl px-5 py-3 divide-y divide-gray-800 print:border-gray-200 print:bg-white print:divide-gray-100">
                {allTopicsWithData
                  .filter(x => x.m && x.m.attempts_total > 0)
                  .sort((a, b) => (a.m?.score_alltime ?? 0) - (b.m?.score_alltime ?? 0))
                  .map(({ topic, m }) => (
                    <TopicMasteryBar
                      key={topic.id}
                      topicId={topic.id}
                      score={m?.score_alltime ?? 0}
                      attempts={m?.attempts_total ?? 0}
                    />
                  ))}
                {allTopicsWithData.filter(x => x.m && x.m.attempts_total > 0).length === 0 && (
                  <p className="text-gray-600 text-sm py-4">No topic data yet.</p>
                )}
              </div>
            </section>

            {/* Recent Sessions */}
            <section>
              <SectionHeading>Recent Sessions (last 10)</SectionHeading>
              <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden print:border-gray-200 print:bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 print:border-gray-200">
                      <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Date</th>
                      <th className="text-center text-xs font-medium text-gray-500 px-2 py-3">Score</th>
                      <th className="text-center text-xs font-medium text-gray-500 px-2 py-3">Accuracy</th>
                      <th className="text-center text-xs font-medium text-gray-500 px-2 py-3 hidden sm:table-cell">Time</th>
                      <th className="text-center text-xs font-medium text-gray-500 px-2 py-3 hidden sm:table-cell">XP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.slice(0, 10).map((s, i) => {
                      const acc = s.total_questions > 0
                        ? Math.round((s.correct_count / s.total_questions) * 100)
                        : null
                      return (
                        <tr
                          key={s.id}
                          className={`border-b border-gray-800 last:border-0 print:border-gray-100 ${
                            i % 2 === 0 ? '' : 'bg-gray-900/40'
                          }`}
                        >
                          <td className="px-4 py-3 text-gray-300 print:text-gray-700">
                            {formatDate(s.started_at)}
                          </td>
                          <td className="px-2 py-3 text-center text-gray-200 font-medium print:text-gray-800">
                            {s.correct_count}/{s.total_questions}
                          </td>
                          <td className="px-2 py-3 text-center">
                            {acc !== null ? (
                              <span
                                className={`font-semibold ${
                                  acc < 50 ? 'text-red-400' : acc < 75 ? 'text-amber-400' : 'text-green-400'
                                } print:text-gray-700`}
                              >
                                {acc}%
                              </span>
                            ) : '—'}
                          </td>
                          <td className="px-2 py-3 text-center text-gray-500 hidden sm:table-cell print:table-cell print:text-gray-600">
                            {s.duration_seconds ? formatDuration(s.duration_seconds) : '—'}
                          </td>
                          <td className="px-2 py-3 text-center text-blue-400 font-medium hidden sm:table-cell print:table-cell print:text-gray-700">
                            +{s.xp_earned ?? 0}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Badges */}
            {badges.length > 0 && (
              <section>
                <SectionHeading>Badges Earned ({badges.length})</SectionHeading>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {badges.map(sb => (
                    <div
                      key={sb.id}
                      className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-start gap-3 print:border-gray-200 print:bg-white"
                    >
                      <span className="text-2xl">{sb.badge?.icon ?? '🏅'}</span>
                      <div className="min-w-0">
                        <p className="text-white text-sm font-semibold truncate print:text-gray-900">
                          {sb.badge?.name ?? sb.badge_id}
                        </p>
                        <p className="text-gray-500 text-xs mt-0.5 print:text-gray-500">
                          {new Date(sb.earned_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Gaps to address */}
            {mastery.length > 0 && (
              <section className="print:break-before-auto">
                <SectionHeading>Focus Areas (lowest mastery)</SectionHeading>
                <div className="bg-gray-900 border border-gray-800 rounded-2xl px-5 py-4 space-y-1 print:border-gray-200 print:bg-white">
                  {mastery
                    .filter(m => m.attempts_total > 0)
                    .slice(0, 5)
                    .map(m => {
                      const topic = getTopicById(m.topic_id)
                      return (
                        <div key={m.topic_id} className="flex justify-between items-center py-1">
                          <span className="text-sm text-gray-300 print:text-gray-700">
                            {topic?.name ?? m.topic_id}
                          </span>
                          <span
                            className={`text-sm font-semibold ${
                              m.score_alltime < 0.5 ? 'text-red-400' : 'text-amber-400'
                            } print:text-gray-700`}
                          >
                            {Math.round(m.score_alltime * 100)}%
                          </span>
                        </div>
                      )
                    })}
                </div>
              </section>
            )}

            {/* Supervisor note */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-4 text-xs text-gray-500 print:border-gray-200 print:bg-gray-50">
              <strong className="text-gray-400 print:text-gray-600">Note for {profile?.display_name ?? 'parent'}:</strong>{' '}
              This report shows data visible to this account. If student data is not showing, ask your developer to add
              the parent read policy to the Supabase project. Accuracy is calculated across all completed sessions.
            </div>
          </>
        )}

        {/* Bottom padding */}
        <div className="h-4 print:hidden" />
      </div>
    </div>
  )
}
