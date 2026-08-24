import { describe, it, expect } from 'vitest'
import { sessionTimeLimitSeconds, writingTimeLimitSeconds, formatClock } from './sessionTimer'

describe('sessionTimeLimitSeconds', () => {
  it('defaults to 60 seconds per question — the real EduTest pace', () => {
    expect(sessionTimeLimitSeconds(20, {})).toBe(1200)
    expect(sessionTimeLimitSeconds(40, {})).toBe(2400)
  })

  it('returns null when the parent has switched the timer off', () => {
    expect(sessionTimeLimitSeconds(20, { timer_enabled: 'false' })).toBeNull()
    expect(writingTimeLimitSeconds({ timer_enabled: 'false' })).toBeNull()
  })

  it('honours a custom pace', () => {
    expect(sessionTimeLimitSeconds(40, { timer_seconds_per_question: '45' })).toBe(1800)
  })

  it('ignores a nonsense pace rather than producing a zero-length test', () => {
    expect(sessionTimeLimitSeconds(10, { timer_seconds_per_question: 'abc' })).toBe(600)
    expect(sessionTimeLimitSeconds(10, { timer_seconds_per_question: '0' })).toBe(600)
    expect(sessionTimeLimitSeconds(10, { timer_seconds_per_question: '-30' })).toBe(600)
  })

  it('never returns less than a minute, even for a one-question session', () => {
    expect(sessionTimeLimitSeconds(1, { timer_seconds_per_question: '5' })).toBe(60)
  })
})

describe('writingTimeLimitSeconds', () => {
  it('defaults to the 15 minutes the real paper allows', () => {
    expect(writingTimeLimitSeconds({})).toBe(900)
  })

  it('honours a configured value', () => {
    expect(writingTimeLimitSeconds({ writing_time_seconds: '1200' })).toBe(1200)
  })
})

describe('formatClock', () => {
  it('renders mm:ss with a padded seconds field', () => {
    expect(formatClock(725)).toBe('12:05')
    expect(formatClock(60)).toBe('1:00')
    expect(formatClock(9)).toBe('0:09')
    expect(formatClock(0)).toBe('0:00')
  })

  it('never renders a negative clock', () => {
    expect(formatClock(-5)).toBe('0:00')
  })
})
