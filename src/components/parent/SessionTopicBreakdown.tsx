import { DOMAIN_NAMES, getTopicById } from '../../lib/curriculum'
import { accuracyColour } from '../../lib/formatters'
import type { Attempt, Domain } from '../../types'

interface SessionTopicBreakdownProps {
  attempts: Attempt[]
}

interface Tally { total: number; correct: number }

const DOMAIN_ORDER: Domain[] = ['maths', 'reading', 'verbal', 'abstract', 'writing']

/** Group a session's attempts into domain -> topic tallies, in curriculum order. */
function groupByDomain(attempts: Attempt[]) {
  const byDomain = new Map<Domain, { total: Tally; topics: Map<string, Tally> }>()

  for (const a of attempts) {
    const domain = (getTopicById(a.topic_id)?.domain ?? 'maths') as Domain
    const entry = byDomain.get(domain) ?? { total: { total: 0, correct: 0 }, topics: new Map() }
    const topic = entry.topics.get(a.topic_id) ?? { total: 0, correct: 0 }

    entry.total.total += 1
    topic.total += 1
    if (a.is_correct) {
      entry.total.correct += 1
      topic.correct += 1
    }
    entry.topics.set(a.topic_id, topic)
    byDomain.set(domain, entry)
  }

  return DOMAIN_ORDER
    .filter(d => byDomain.has(d))
    .map(d => ({ domain: d, ...byDomain.get(d)! }))
}

function pct(t: Tally): number {
  return t.total > 0 ? Math.round((t.correct / t.total) * 100) : 0
}

function Score({ tally, bold }: { tally: Tally; bold?: boolean }) {
  const p = pct(tally)
  return (
    <span className="flex items-baseline gap-2 shrink-0">
      <span className={`text-sm tabular-nums ${bold ? 'text-gray-200 font-semibold' : 'text-gray-400'} print:text-gray-700`}>
        {tally.correct}/{tally.total}
      </span>
      <span className={`text-sm font-semibold w-10 text-right tabular-nums ${accuracyColour(p)} print:text-gray-700`}>
        {p}%
      </span>
    </span>
  )
}

/** Per-domain and per-topic scores for a single session. */
export function SessionTopicBreakdown({ attempts }: SessionTopicBreakdownProps) {
  const groups = groupByDomain(attempts)

  if (groups.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center print:border-gray-200">
        <p className="text-gray-500 text-sm">No question data saved for this session.</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl divide-y divide-gray-800 print:border-gray-200 print:bg-white print:divide-gray-100">
      {groups.map(({ domain, total, topics }) => (
        <div key={domain} className="px-5 py-3.5">
          {/* Domain roll-up */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide print:text-gray-600">
              {DOMAIN_NAMES[domain]}
            </span>
            <Score tally={total} bold />
          </div>

          {/* Topics within the domain */}
          <div className="mt-2 space-y-1.5">
            {[...topics.entries()].map(([topicId, tally]) => (
              <div key={topicId} className="flex items-center justify-between gap-3 pl-3">
                <span className="text-sm text-gray-300 truncate print:text-gray-700">
                  {getTopicById(topicId)?.name ?? topicId}
                </span>
                <Score tally={tally} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
