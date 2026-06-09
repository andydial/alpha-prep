import type { Mastery, Domain } from '../../types'
import { TOPICS, DOMAIN_NAMES } from '../../lib/curriculum'

const EXAM_DOMAINS: Domain[] = ['maths', 'reading', 'verbal', 'abstract']

function getDomainAvg(domain: Domain, mastery: Mastery[]): number | null {
  const topicIds = TOPICS.filter(t => t.domain === domain).map(t => t.id)
  const rows = mastery.filter(m => topicIds.includes(m.topic_id) && m.attempts_total > 0)
  if (rows.length === 0) return null
  return rows.reduce((sum, m) => sum + m.score_alltime, 0) / rows.length
}

interface DomainPerformanceGridProps {
  mastery: Mastery[]
}

export function DomainPerformanceGrid({ mastery }: DomainPerformanceGridProps) {
  const domainData = EXAM_DOMAINS.map(domain => ({
    domain,
    avg: getDomainAvg(domain, mastery),
  }))

  const withData = domainData.filter(d => d.avg !== null)
  const weakest = withData.length > 0
    ? withData.reduce((a, b) => (a.avg! < b.avg! ? a : b)).domain
    : null

  return (
    <div className="space-y-2">
      <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide px-1">
        Domain Performance
      </p>
      <div className="grid grid-cols-2 gap-3">
        {domainData.map(({ domain, avg }) => {
          const pct = avg !== null ? Math.round(avg * 100) : null
          const isWeakest = domain === weakest

          const cardClass =
            pct === null ? 'border-gray-700 bg-gray-800/50' :
            pct >= 75    ? 'border-green-500/40 bg-green-500/10' :
            pct >= 50    ? 'border-amber-500/40 bg-amber-500/10' :
                           'border-red-500/40 bg-red-500/10'

          const numClass =
            pct === null ? 'text-gray-500' :
            pct >= 75    ? 'text-green-400' :
            pct >= 50    ? 'text-amber-400' :
                           'text-red-400'

          return (
            <div key={domain} className={`rounded-2xl border p-4 ${cardClass}`}>
              <div className="flex items-start justify-between mb-2">
                <p className="text-white text-sm font-semibold">{DOMAIN_NAMES[domain]}</p>
                {isWeakest && (
                  <span className="text-[10px] font-bold uppercase tracking-wide text-red-400 bg-red-500/15 border border-red-500/30 px-1.5 py-0.5 rounded-full">
                    Needs Focus
                  </span>
                )}
              </div>
              <p className={`text-3xl font-extrabold leading-none ${numClass}`}>
                {pct !== null ? `${pct}%` : '—'}
              </p>
              <p className="text-gray-500 text-xs mt-1.5">avg accuracy</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
