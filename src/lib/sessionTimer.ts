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
