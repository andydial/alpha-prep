import { useCallback, useEffect, useRef, useState } from 'react'

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
 */
export function useCountdown(totalSeconds: number | null, onExpire: () => void) {
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const deadline = useRef<number | null>(null)
  const expired = useRef(false)

  // Kept in a ref so a re-rendered callback never restarts the interval.
  const onExpireRef = useRef(onExpire)
  useEffect(() => { onExpireRef.current = onExpire })

  const start = useCallback(() => {
    if (totalSeconds === null) return
    deadline.current = Date.now() + totalSeconds * 1000
    expired.current = false
    setElapsed(0)
    setRunning(true)
  }, [totalSeconds])

  const stop = useCallback(() => {
    deadline.current = null
    setRunning(false)
  }, [])

  useEffect(() => {
    if (totalSeconds === null || !running) return
    const id = setInterval(() => {
      if (deadline.current === null) return
      const left = Math.max(0, Math.round((deadline.current - Date.now()) / 1000))
      setElapsed(totalSeconds - left)
      if (left <= 0 && !expired.current) {
        expired.current = true
        deadline.current = null
        onExpireRef.current()
      }
    }, 500)
    return () => clearInterval(id)
  }, [totalSeconds, running])

  // Derived, not stored: a null limit has no clock at all, and before start()
  // the pill should show the full time rather than a stale value.
  const remaining = totalSeconds === null
    ? null
    : Math.max(0, totalSeconds - elapsed)

  return { remaining, running, start, stop }
}
