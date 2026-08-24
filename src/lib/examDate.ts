/**
 * The exam date lives in settings.exam_date, not in the code.
 *
 * Three modules used to hold `new Date('2026-08-14')` inline. That date passed,
 * which pinned getWeekNumber at its week-8 clamp and pushed every generated
 * question to the top of the difficulty ramp regardless of the real timeline.
 */

/** Used when settings.exam_date is missing or unparseable. */
export const DEFAULT_EXAM_DATE = '2026-09-05'

export function parseExamDate(value?: string | null): Date {
  const parsed = new Date(value ?? DEFAULT_EXAM_DATE)
  return Number.isNaN(parsed.getTime()) ? new Date(DEFAULT_EXAM_DATE) : parsed
}
