import { Timer } from 'lucide-react'
import { formatClock } from '../lib/sessionTimer'

interface SessionTimerProps {
  /** Seconds left, or null when the parent has timing switched off. */
  remaining: number | null
  total: number | null
}

/**
 * The whole-test clock. Stays quiet for most of the session and only starts
 * signalling in the last stretch — a timer that shouts from question one adds
 * pressure without adding information.
 */
export function SessionTimer({ remaining, total }: SessionTimerProps) {
  if (remaining === null || total === null) return null

  const fraction = total > 0 ? remaining / total : 0
  const urgent = fraction <= 0.2
  const warning = !urgent && fraction <= 0.5

  const tone = urgent
    ? 'border-red-500/50 bg-red-500/10 text-red-300'
    : warning
      ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
      : 'border-gray-700 bg-gray-900 text-gray-300'

  return (
    <span
      title="Time remaining for this test"
      className={`flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border
                  text-sm font-semibold tabular-nums transition-colors ${tone} ${urgent ? 'animate-pulse' : ''}`}
    >
      <Timer size={14} />
      {formatClock(remaining)}
    </span>
  )
}
