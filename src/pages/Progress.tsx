import { useState } from 'react'
import { useUser } from '../hooks/useUser'
import { useProgress } from '../hooks/useProgress'
import { getTopicsByDomain } from '../lib/curriculum'
import { TopicMasteryBar } from '../components/TopicMasteryBar'
import { ProgressChart } from '../components/ProgressChart'
import type { Topic } from '../types'

type Domain = Topic['domain']

const DOMAINS: { id: Domain; label: string; active: string }[] = [
  { id: 'maths',    label: 'Maths',    active: 'border-blue-500 text-blue-400'   },
  { id: 'reading',  label: 'Reading',  active: 'border-purple-500 text-purple-400' },
  { id: 'verbal',   label: 'Verbal',   active: 'border-amber-500 text-amber-400' },
  { id: 'abstract', label: 'Abstract', active: 'border-cyan-500 text-cyan-400'   },
  { id: 'writing',  label: 'Writing',  active: 'border-green-500 text-green-400' },
]

export function Progress() {
  const { user } = useUser()
  const { mastery, loading } = useProgress(user?.id)
  const [domain, setDomain] = useState<Domain>('maths')

  const topicsInDomain = getTopicsByDomain(domain)

  const masteryMap = Object.fromEntries(mastery.map(m => [m.topic_id, m]))

  const topicsWithData = topicsInDomain.map(t => ({
    topic: t,
    mastery: masteryMap[t.id] ?? null,
  }))

  const hasMastery = mastery.length > 0

  // Biggest improvement = highest score_alltime with attempts > 0
  const best = [...mastery].sort((a, b) => b.score_alltime - a.score_alltime)[0]
  // Biggest gap = lowest score_alltime with attempts > 0
  const gap = [...mastery].filter(m => m.attempts_total > 0).sort((a, b) => a.score_alltime - b.score_alltime)[0]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 p-6">
        <div className="max-w-2xl mx-auto space-y-4 animate-pulse">
          <div className="h-8 bg-gray-800 rounded w-48" />
          <div className="h-48 bg-gray-900 rounded-2xl" />
          <div className="h-12 bg-gray-900 rounded-2xl" />
          <div className="h-64 bg-gray-900 rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-2xl mx-auto space-y-6">

        <h1 className="text-2xl font-bold text-white">Your Progress</h1>

        {/* 14-day trend chart */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
            14-Day Accuracy Trend
          </h2>
          {user && <ProgressChart studentId={user.id} />}
        </div>

        {!hasMastery ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center text-gray-500">
            No data yet — start a session!
          </div>
        ) : (
          <>
            {/* Domain tabs */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
              <div className="flex border-b border-gray-800">
                {DOMAINS.map(d => (
                  <button
                    key={d.id}
                    onClick={() => setDomain(d.id)}
                    className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                      domain === d.id
                        ? `${d.active} bg-gray-800/50`
                        : 'border-transparent text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>

              {/* Topic bars */}
              <div className="p-5 divide-y divide-gray-800">
                {topicsWithData.map(({ topic, mastery: m }) => (
                  <TopicMasteryBar
                    key={topic.id}
                    topicId={topic.id}
                    score={m ? m.score_alltime : 0}
                    attempts={m ? m.attempts_total : 0}
                  />
                ))}
              </div>
            </div>

            {/* Summary row */}
            <div className="grid grid-cols-2 gap-4">
              {best && (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Biggest Strength</p>
                  <p className="text-green-400 font-semibold text-sm">
                    {best.topic_id.replace(/_/g, ' ')}
                  </p>
                  <p className="text-2xl font-bold text-green-400 mt-1">
                    {Math.round(best.score_alltime * 100)}%
                  </p>
                </div>
              )}
              {gap && (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Biggest Gap</p>
                  <p className="text-red-400 font-semibold text-sm">
                    {gap.topic_id.replace(/_/g, ' ')}
                  </p>
                  <p className="text-2xl font-bold text-red-400 mt-1">
                    {Math.round(gap.score_alltime * 100)}%
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
