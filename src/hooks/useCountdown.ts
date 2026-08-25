import { useCallback, useEffect, useRef, useState } from 'react'
import { PausableClock } from '../lib/sessionTimer'

/**
 * A countdown anchored to a wall-clock deadline rather than a decrementing
 * counter.
 *
 * Browsers throttle background tabs to roughly one timer tick per minute, so a
 * counter that subtracts one per tick drifts badly the moment Aarav switches
 * away. Storing the deadline and recomputing from Date.now() means the clock is
 * always right when he comes back, and the test still ends when it should have.
 *
 * `totalSeconds` of null means the parent has timing switched off: nothing
 * ticks and `remaining` stays null.
 *
 * The clock can be frozen with `setPaused` — see PausableClock for why both the
 * app thinking and the student taking a break go through the same door.
 */
export function useCountdown(totalSeconds: number | null, onExpire: () => void) {
  const clock = useRef(new PausableClock())

  // Null until the clock has been read at least once, so the pill shows the
  // full time before start() rather than a stale value.
  const [displayed, setDisplayed] = useState<number | null>(null)
  const [running, setRunning] = useState(false)
  const [paused, setPausedFlag] = useState(false)
  const expired = useRef(false)

  // Kept in a ref so a re-rendered callback never restarts the interval.
  const onExpireRef = useRef(onExpire)
  useEffect(() => { onExpireRef.current = onExpire })

  const start = useCallback(() => {
    if (totalSeconds === null) return
    const now = Date.now()
    clock.current.start(now, totalSeconds)
    expired.current = false
    setRunning(true)
    setPausedFlag(clock.current.paused)
    setDisplayed(clock.current.remainingSeconds(now))
  }, [totalSeconds])

  const stop = useCallback(() => {
    // Deliberately leaves `displayed` alone: a stopped clock keeps showing the
    // time it stopped at rather than snapping back to the full limit.
    clock.current.stop()
    setRunning(false)
    setPausedFlag(false)
  }, [])

  /**
   * Freeze or unfreeze the clock. Idempotent in both directions, so several
   * callers — question generation, answer marking, the student's own Pause
   * button — can be collapsed into one derived boolean and driven from an
   * effect without any of them needing to know about the others.
   */
  const setPaused = useCallback((next: boolean) => {
    // No clock to hold when the parent has timing off — and writing a reading
    // here before the limit is known would publish a bogus 0:00.
    if (totalSeconds === null) return
    const now = Date.now()
    if (next) clock.current.pause(now)
    else clock.current.resume(now)
    setPausedFlag(clock.current.paused)
    // Only once started does the clock know the limit; before that `displayed`
    // stays null so the pill keeps showing the full time rather than 0:00.
    if (clock.current.started) setDisplayed(clock.current.remainingSeconds(now))
  }, [totalSeconds])

  useEffect(() => {
    if (totalSeconds === null || !running) return
    const id = setInterval(() => {
      const now = Date.now()
      setDisplayed(clock.current.remainingSeconds(now))
      if (clock.current.hasExpired(now) && !expired.current) {
        expired.current = true
        setRunning(false)   // stop ticking; `displayed` stays at 0
        onExpireRef.current()
      }
    }, 500)
    return () => clearInterval(id)
  }, [totalSeconds, running])

  const remaining = totalSeconds === null ? null : (displayed ?? totalSeconds)

  return { remaining, running, paused, start, stop, setPaused }
}
