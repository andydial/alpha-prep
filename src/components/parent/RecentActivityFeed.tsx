import { Link } from 'react-router-dom'
import { formatDuration, formatShortDate, accuracyColour } from '../../lib/formatters'
import type { SessionSummary } from '../../hooks/useParentReport'

interface RecentActivityFeedProps {
  sessions: SessionSummary[]
}

/** The last few sessions, each linking to its drill-down on the report. */
export function RecentActivityFeed({ sessions }: RecentActivityFeedProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between px-1">
        <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide">
          Recent Sessions
        </p>
        <Link to="/report" className="text-blue-400 hover:text-blue-300 text-xs font-medium transition-colors">
          View all ›
        </Link>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        {sessions.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">No sessions yet.</p>
        ) : (
          <ul className="divide-y divide-gray-800/60">
            {sessions.map(s => (
              <li key={s.id}>
                <Link
                  to={`/report/session/${s.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-800/50 transition-colors"
                >
                  <span className="text-gray-300 text-sm shrink-0">
                    {formatShortDate(s.completed_at ?? s.started_at)}
                  </span>
                  <span className="text-gray-500 text-xs shrink-0">
                    {formatDuration(s.duration_seconds)} · {s.attempted} Q
                  </span>
                  <span className="flex items-center gap-2 shrink-0">
                    <span className="text-gray-200 text-sm font-medium tabular-nums">
                      {s.correct}/{s.attempted}
                    </span>
                    {s.accuracy !== null && (
                      <span className={`text-sm font-semibold tabular-nums ${accuracyColour(s.accuracy)}`}>
                        {s.accuracy}%
                      </span>
                    )}
                    <span className="text-gray-600">›</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
