import { Link } from 'react-router-dom'
import {
  formatDuration, formatShortDate, formatTime, accuracyColour,
} from '../../lib/formatters'
import type { SessionSummary } from '../../hooks/useParentReport'

interface SessionListProps {
  sessions: SessionSummary[]
}

/**
 * Every completed session, newest first. Each row links to the drill-down at
 * /report/session/:id. Duration and attempted-count lead, since those are the
 * two numbers the parent scans for.
 */
export function SessionList({ sessions }: SessionListProps) {
  if (sessions.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-10 text-center print:border-gray-200 print:bg-white">
        <p className="text-gray-400 text-sm">No completed sessions yet.</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden print:border-gray-200 print:bg-white">
      {/* Column headers — hidden on mobile, where each row becomes a stacked card */}
      <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto_1.5rem] gap-4 px-5 py-3 border-b border-gray-800 print:border-gray-200">
        <span className="text-xs font-medium text-gray-500">Date</span>
        <span className="text-xs font-medium text-gray-500 w-16 text-right">Time spent</span>
        <span className="text-xs font-medium text-gray-500 w-20 text-right">Questions</span>
        <span className="text-xs font-medium text-gray-500 w-24 text-right">Score</span>
        <span />
      </div>

      <ul className="divide-y divide-gray-800 print:divide-gray-100">
        {sessions.map(s => (
          <li key={s.id}>
            <Link
              to={`/report/session/${s.id}`}
              className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_auto_auto_1.5rem] gap-x-4 gap-y-1 px-5 py-3.5 items-center hover:bg-gray-800/50 transition-colors print:hover:bg-transparent"
            >
              {/* Date + time of day */}
              <span className="min-w-0">
                <span className="block text-sm text-gray-200 print:text-gray-800">
                  {formatShortDate(s.started_at)}
                </span>
                <span className="block text-xs text-gray-500 print:text-gray-400">
                  {formatTime(s.started_at)}
                </span>
              </span>

              {/* Mobile: duration · questions on one line. Desktop: separate columns. */}
              <span className="sm:hidden text-right text-xs text-gray-400">
                {formatDuration(s.duration_seconds)} · {s.attempted} Q
              </span>
              <span className="hidden sm:block w-16 text-right text-sm text-gray-400 print:text-gray-600">
                {formatDuration(s.duration_seconds)}
              </span>
              <span className="hidden sm:block w-20 text-right text-sm text-gray-400 print:text-gray-600">
                {s.attempted}
              </span>

              {/* Score — full width on mobile under the date */}
              <span className="col-span-2 sm:col-span-1 sm:w-24 text-right">
                <span className="text-sm text-gray-200 font-medium print:text-gray-800">
                  {s.correct}/{s.attempted}
                </span>
                {s.accuracy !== null && (
                  <span className={`text-sm font-semibold ml-2 ${accuracyColour(s.accuracy)} print:text-gray-600`}>
                    {s.accuracy}%
                  </span>
                )}
              </span>

              <span className="hidden sm:block text-gray-600 text-right print:hidden">›</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
