/**
 * Whole-test timing.
 *
 * The EduTest paper is sat under real time pressure — roughly 60 seconds per
 * question — so a practice session that lets Aarav think as long as he likes is
 * not practice for the thing he will sit. The parent can switch the clock off
 * from Settings, which is what `null` means everywhere below.
 */

export const DEFAULT_SECONDS_PER_QUESTION = 60

/** Shortest sensible test, so a bad setting cannot produce a zero-length clock. */
const MINIMUM_TOTAL_SECONDS = 60

/**
 * Total time for a session, or null when the parent has timing switched off.
 */
export function sessionTimeLimitSeconds(
  totalQuestions: number,
  settings: Record<string, string>,
): number | null {
  if (settings.timer_enabled === 'false') return null
  const parsed = parseInt(settings.timer_seconds_per_question ?? '', 10)
  const perQuestion = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_SECONDS_PER_QUESTION
  return Math.max(MINIMUM_TOTAL_SECONDS, Math.round(totalQuestions * perQuestion))
}

/** Seconds allowed for the Written Expression task, or null when untimed. */
export function writingTimeLimitSeconds(settings: Record<string, string>): number | null {
  if (settings.timer_enabled === 'false') return null
  const parsed = parseInt(settings.writing_time_seconds ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 900
}

/** 725 -> "12:05". Never renders a negative clock. */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/**
 * A countdown anchored to wall-clock time that can be paused.
 *
 * Two very different things stop the clock, and they turn out to be the same
 * operation:
 *
 *  - the app is thinking, and the student is only waiting on us — a question
 *    being generated, or a wrong answer going out for a second opinion. Time
 *    spent staring at a spinner is not time spent on the paper, so charging it
 *    to the test makes a session shorter than the one it is meant to simulate.
 *  - the student has taken a break (dinner, a phone call) and asked for the
 *    test to hold.
 *
 * Both shift the deadline forward by however long the pause lasted, so both go
 * through here. Every method takes `now` rather than reading the clock itself,
 * which is what makes the arithmetic testable without faking timers.
 */
export class PausableClock {
  private endsAt: number | null = null
  private pausedAt: number | null = null
  private total = 0

  get started(): boolean { return this.endsAt !== null }
  get paused(): boolean { return this.pausedAt !== null }
  get totalSeconds(): number { return this.total }

  /**
   * The limit is supplied here rather than at construction because it comes
   * from the settings table and so arrives after the component first renders.
   * Taking it at start() means a late-arriving setting can never move a
   * deadline that is already ticking.
   */
  start(now: number, totalSeconds: number): void {
    this.total = Math.max(0, totalSeconds)
    this.endsAt = now + this.total * 1000
    // The first question is generated before the session is really underway, so
    // start() routinely lands while already paused. Re-anchor rather than bank
    // the wait: otherwise the deadline jumps forward by the generation time the
    // moment the first question appears.
    if (this.pausedAt !== null) this.pausedAt = now
  }

  stop(): void {
    this.endsAt = null
    this.pausedAt = null
  }

  /** Idempotent — a second pause while already paused does nothing. */
  pause(now: number): void {
    if (this.pausedAt === null) this.pausedAt = now
  }

  /** Idempotent — resuming a running clock does nothing. */
  resume(now: number): void {
    if (this.pausedAt === null) return
    if (this.endsAt !== null) this.endsAt += now - this.pausedAt
    this.pausedAt = null
  }

  /** Seconds left; frozen at the pause instant while paused. */
  remainingSeconds(now: number): number {
    if (this.endsAt === null) return this.total
    const at = this.pausedAt ?? now
    return Math.max(0, Math.round((this.endsAt - at) / 1000))
  }

  /** A paused clock never expires, however long the break runs. */
  hasExpired(now: number): boolean {
    return this.endsAt !== null && this.pausedAt === null && this.endsAt - now <= 0
  }
}
