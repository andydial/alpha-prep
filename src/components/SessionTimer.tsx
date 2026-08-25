import { Pause, Timer } from 'lucide-react'
import { formatClock } from '../lib/sessionTimer'

interface SessionTimerProps {
  /** Seconds left, or null when the parent has timing switched off. */
  remaining: number | null
  total: number | null
  /** True while the clock is held — a break, or the app generating/marking. */
  paused?: boolean
}

/**
 * The whole-test clock. Stays quiet for most of the session and only starts
 * signalling in the last stretch — a timer that shouts from question one adds
 * pressure without adding information.
 *
 * A held clock is shown as held. A number that has simply stopped moving looks
 * like a bug, and the whole point of pausing is that Aarav can see he is not
 * being charged for the wait.
 */
export function SessionTimer({ remaining, total, paused = false }: SessionTimerProps) {
  if (remaining === null || total === null) return null

  const fraction = total > 0 ? remaining / total : 0
  const urgent = !paused && fraction <= 0.2
  const warning = !paused && !urgent && fraction <= 0.5

  const tone = paused
    ? 'border-blue-500/40 bg-blue-500/10 text-blue-300'
    : urgent
      ? 'border-red-500/50 bg-red-500/10 text-red-300'
      : warning
        ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
        : 'border-gray-700 bg-gray-900 text-gray-300'

  return (
    <span
      title={paused ? 'Clock paused — this time is not counted' : 'Time remaining for this test'}
      className={`flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border
                  text-sm font-semibold tabular-nums transition-colors ${tone} ${urgent ? 'animate-pulse' : ''}`}
    >
      {paused ? <Pause size={14} /> : <Timer size={14} />}
      {formatClock(remaining)}
    </span>
  )
}
