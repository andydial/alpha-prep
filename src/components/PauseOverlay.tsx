import { Pause, Play } from 'lucide-react'
import { formatClock } from '../lib/sessionTimer'

interface PauseOverlayProps {
  /** Seconds left when the clock stopped, or null for an untimed session. */
  remaining: number | null
  /** Line of context, e.g. "Question 12 of 40". */
  detail?: string
  onResume: () => void
}

/**
 * The break screen.
 *
 * Deliberately opaque rather than a translucent scrim: the point of a break is
 * that Aarav walks away, and leaving the question readable behind a blur would
 * turn "pause for dinner" into unlimited thinking time. It sits over the page
 * instead of replacing it so nothing he has already typed is lost.
 */
export function PauseOverlay({ remaining, detail, onResume }: PauseOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm text-center space-y-7">
        <div className="w-16 h-16 rounded-full bg-blue-500/15 border border-blue-500/40 flex items-center justify-center mx-auto">
          <Pause size={26} className="text-blue-400" />
        </div>

        <div className="space-y-2">
          <p className="text-white text-2xl font-bold">Test paused</p>
          <p className="text-gray-400 text-sm">
            Take your time — the clock is stopped and nothing is lost.
          </p>
        </div>

        {remaining !== null && (
          <div className="inline-flex flex-col items-center gap-1 bg-gray-900 border border-gray-700 rounded-2xl px-6 py-4">
            <span className="text-3xl font-bold text-white tabular-nums">{formatClock(remaining)}</span>
            <span className="text-gray-500 text-xs uppercase tracking-wide">still on the clock</span>
          </div>
        )}

        {detail && <p className="text-gray-500 text-sm">{detail}</p>}

        <button
          onClick={onResume}
          autoFocus
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl
                     transition-colors text-base inline-flex items-center justify-center gap-2"
        >
          <Play size={18} /> Resume test
        </button>
      </div>
    </div>
  )
}
