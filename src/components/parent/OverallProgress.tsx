import { TOPICS, getTopicById } from '../../lib/curriculum'
import { accuracyColour, accuracyBarColour } from '../../lib/formatters'
import { TopicMasteryBar } from '../TopicMasteryBar'
import type { Mastery, StudentBadge } from '../../types'

const DOMAINS = ['maths', 'reading', 'verbal', 'abstract', 'writing'] as const

interface OverallProgressProps {
  mastery: Mastery[]
  badges: StudentBadge[]
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 print:text-gray-600">
      {children}
    </h3>
  )
}

/**
 * The long-run picture: domain scores, per-topic mastery, badges, weakest topics.
 * Rendered inside a collapsed <details> on the report so the session list leads —
 * `print:open` via the parent keeps it visible in printed copies.
 */
export function OverallProgress({ mastery, badges }: OverallProgressProps) {
  const masteryMap = Object.fromEntries(mastery.map(m => [m.topic_id, m]))
  const withData = TOPICS
    .map(t => ({ topic: t, m: masteryMap[t.id] ?? null }))
    .filter(x => x.m && x.m.attempts_total > 0)

  const domainSummary = DOMAINS.map(d => {
    const rows = withData.filter(x => x.topic.domain === d)
    if (rows.length === 0) return { domain: d, avg: null }
    const avg = rows.reduce((sum, x) => sum + (x.m?.score_alltime ?? 0), 0) / rows.length
    return { domain: d, avg: Math.round(avg * 100) }
  })

  return (
    <div className="space-y-6 pt-4">
      {/* Domain scores */}
      <section>
        <SubHeading>Domain Scores</SubHeading>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl px-5 py-4 space-y-2 print:border-gray-200 print:bg-white">
          {domainSummary.map(({ domain, avg }) => (
            <div key={domain} className="flex items-center gap-3">
              <span className="w-20 text-sm text-gray-300 capitalize print:text-gray-700">{domain}</span>
              {avg === null ? (
                <span className="text-gray-600 text-xs">No data</span>
              ) : (
                <>
                  <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden print:bg-gray-200">
                    <div className={`h-2 rounded-full ${accuracyBarColour(avg)}`} style={{ width: `${avg}%` }} />
                  </div>
                  <span className={`w-10 text-right text-sm font-semibold ${accuracyColour(avg)} print:text-gray-700`}>
                    {avg}%
                  </span>
                </>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Topic mastery */}
      <section>
        <SubHeading>Topic Mastery</SubHeading>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl px-5 py-3 divide-y divide-gray-800 print:border-gray-200 print:bg-white print:divide-gray-100">
          {withData.length === 0 ? (
            <p className="text-gray-600 text-sm py-4">No topic data yet.</p>
          ) : (
            [...withData]
              .sort((a, b) => (a.m?.score_alltime ?? 0) - (b.m?.score_alltime ?? 0))
              .map(({ topic, m }) => (
                <TopicMasteryBar
                  key={topic.id}
                  topicId={topic.id}
                  score={m?.score_alltime ?? 0}
                  attempts={m?.attempts_total ?? 0}
                />
              ))
          )}
        </div>
      </section>

      {/* Focus areas */}
      {withData.length > 0 && (
        <section>
          <SubHeading>Focus Areas (lowest mastery)</SubHeading>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl px-5 py-4 space-y-1 print:border-gray-200 print:bg-white">
            {mastery
              .filter(m => m.attempts_total > 0)
              .slice(0, 5)
              .map(m => {
                const pct = Math.round(m.score_alltime * 100)
                return (
                  <div key={m.topic_id} className="flex justify-between items-center py-1">
                    <span className="text-sm text-gray-300 print:text-gray-700">
                      {getTopicById(m.topic_id)?.name ?? m.topic_id}
                    </span>
                    <span className={`text-sm font-semibold ${accuracyColour(pct)} print:text-gray-700`}>
                      {pct}%
                    </span>
                  </div>
                )
              })}
          </div>
        </section>
      )}

      {/* Badges */}
      {badges.length > 0 && (
        <section>
          <SubHeading>Badges Earned ({badges.length})</SubHeading>
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
    </div>
  )
}
