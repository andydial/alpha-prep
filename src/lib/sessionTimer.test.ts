import { describe, it, expect } from 'vitest'
import { sessionTimeLimitSeconds, writingTimeLimitSeconds, formatClock, PausableClock } from './sessionTimer'

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

describe('PausableClock', () => {
  const T0 = 1_700_000_000_000
  const at = (seconds: number) => T0 + seconds * 1000

  it('counts down from the deadline it was started with', () => {
    const clock = new PausableClock()
    clock.start(T0, 600)
    expect(clock.remainingSeconds(at(0))).toBe(600)
    expect(clock.remainingSeconds(at(90))).toBe(510)
  })

  it('reads zero before it is started — the hook shows the limit until then', () => {
    expect(new PausableClock().remainingSeconds(T0)).toBe(0)
  })

  it('does not charge the student for a pause', () => {
    const clock = new PausableClock()
    clock.start(T0, 600)
    clock.pause(at(100))            // 500 left, question goes off to be marked
    clock.resume(at(130))           // 30 seconds of API round trip
    expect(clock.remainingSeconds(at(130))).toBe(500)
    expect(clock.remainingSeconds(at(160))).toBe(470)
  })

  it('freezes the displayed clock for the length of the pause', () => {
    const clock = new PausableClock()
    clock.start(T0, 600)
    clock.pause(at(100))
    expect(clock.remainingSeconds(at(400))).toBe(500)   // five minutes into dinner
    expect(clock.paused).toBe(true)
  })

  it('never expires while paused, however long the break runs', () => {
    const clock = new PausableClock()
    clock.start(T0, 60)
    clock.pause(at(10))
    expect(clock.hasExpired(at(100_000))).toBe(false)
    clock.resume(at(100_000))
    expect(clock.remainingSeconds(at(100_000))).toBe(50)
    expect(clock.hasExpired(at(100_049))).toBe(false)
    expect(clock.hasExpired(at(100_050))).toBe(true)
  })

  it('is idempotent in both directions, so overlapping callers cannot double-count', () => {
    const clock = new PausableClock()
    clock.start(T0, 600)
    clock.pause(at(100))
    clock.pause(at(140))            // a second reason to hold arrives mid-pause
    clock.resume(at(160))
    clock.resume(at(200))           // and is released twice
    expect(clock.remainingSeconds(at(200))).toBe(460)
  })

  it('does not bank the wait when the clock starts while already paused', () => {
    // The first question is generated before start() is reached.
    const clock = new PausableClock()
    clock.pause(at(0))
    clock.start(at(5), 600)
    clock.resume(at(35))            // 30s generating the first question
    expect(clock.remainingSeconds(at(35))).toBe(600)
  })

  it('takes its limit at start, so a late settings read cannot move a live deadline', () => {
    const clock = new PausableClock()
    clock.start(T0, 1200)
    expect(clock.remainingSeconds(at(0))).toBe(1200)
    expect(clock.totalSeconds).toBe(1200)
  })

  it('expires exactly at the deadline and never reads below zero', () => {
    const clock = new PausableClock()
    clock.start(T0, 60)
    expect(clock.hasExpired(at(59))).toBe(false)
    expect(clock.hasExpired(at(60))).toBe(true)
    expect(clock.remainingSeconds(at(120))).toBe(0)
  })
})
