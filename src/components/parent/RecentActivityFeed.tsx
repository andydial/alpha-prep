import type { Session } from '../../types'

interface RecentActivityFeedProps {
  sessions: Session[]
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

export function RecentActivityFeed({ sessions }: RecentActivityFeedProps) {
  return (
    <div className="space-y-2">
      <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide px-1">
        Recent Sessions
      </p>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        {sessions.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">No sessions yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-gray-500 font-medium px-4 py-3">Date</th>
                <th className="text-center text-gray-500 font-medium px-4 py-3">Score</th>
                <th className="text-right text-gray-500 font-medium px-4 py-3">XP</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s, i) => {
                const pct = s.total_questions > 0
                  ? Math.round((s.correct_count / s.total_questions) * 100)
                  : 0
                const numClass =
                  pct >= 75 ? 'text-green-400' :
                  pct >= 50 ? 'text-amber-400' :
                  'text-red-400'
                return (
                  <tr
                    key={s.id}
                    className={i < sessions.length - 1 ? 'border-b border-gray-800/60' : ''}
                  >
                    <td className="text-gray-300 px-4 py-3">{fmtDate(s.completed_at!)}</td>
                    <td className="text-center px-4 py-3">
                      <span className={`font-semibold ${numClass}`}>
                        {s.correct_count}/{s.total_questions}
                      </span>
                      <span className="text-gray-500 text-xs ml-1">({pct}%)</span>
                    </td>
                    <td className="text-right text-blue-400 font-medium px-4 py-3">
                      +{s.xp_earned ?? 0}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
