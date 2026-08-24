import { describe, it, expect } from 'vitest'
import { rankWeakness, buildBlueprint } from './weakness'
import type { Mastery } from '../types'

function m(topic_id: string, attempts_total: number, score_alltime: number): Mastery {
  return {
    id: topic_id,
    student_id: 's',
    topic_id,
    last_updated: '',
    attempts_total,
    attempts_correct: Math.round(attempts_total * score_alltime),
    score_7day: score_alltime,
    score_alltime,
    current_difficulty: 6,
  }
}

const TOPICS = ['t_strong', 't_mid', 't_weak', 't_weak2', 't_new']
const MASTERY = [
  m('t_strong', 20, 0.95),
  m('t_mid', 20, 0.7),
  m('t_weak', 20, 0.3),
  m('t_weak2', 20, 0.45),
]

// Deterministic rng so ordering assertions are stable.
const rng = () => 0.5

describe('rankWeakness', () => {
  it('puts the lowest-scoring topic first', () => {
    expect(rankWeakness(TOPICS, MASTERY, [])[0].topicId).toBe('t_weak')
  })

  it('lets a recent collapse outrank a better all-time score', () => {
    const recent = Array.from({ length: 10 }, () => ({ topic_id: 't_mid', is_correct: false }))
    const ranked = rankWeakness(TOPICS, MASTERY, recent)
    expect(ranked.findIndex(r => r.topicId === 't_mid')).toBeLessThan(
      ranked.findIndex(r => r.topicId === 't_weak2'),
    )
  })

  it('parks unattempted topics mid-pack, not top', () => {
    const ranked = rankWeakness(TOPICS, MASTERY, [])
    expect(ranked[0].topicId).not.toBe('t_new')
    expect(ranked.at(-1)!.topicId).toBe('t_strong')
  })
})

describe('buildBlueprint', () => {
  const band = { core: 7, stretch: 9 }
  const build = (count: number) =>
    buildBlueprint({ topicIds: TOPICS, count, band, mastery: MASTERY, recent: [], rng })

  it('produces exactly `count` slots', () => {
    for (const n of [10, 15, 20, 40]) expect(build(n).length).toBe(n)
  })

  it('gives the weakest topic 1-3 more questions than an even spread', () => {
    for (const n of [10, 20, 40]) {
      const slots = build(n)
      const even = Math.floor(n / TOPICS.length)
      const weak = slots.filter(s => s.topicId === 't_weak').length
      expect(weak - even).toBeGreaterThanOrEqual(1)
      expect(weak - even).toBeLessThanOrEqual(3)
    }
  })

  it('never turns the session into a single-topic drill', () => {
    for (const n of [10, 20, 40]) {
      const slots = build(n)
      const counts = new Map<string, number>()
      for (const s of slots) counts.set(s.topicId, (counts.get(s.topicId) ?? 0) + 1)
      expect(counts.size).toBeGreaterThanOrEqual(3)
      expect(Math.max(...counts.values()) / n).toBeLessThanOrEqual(0.4)
    }
  })

  it('spreads the drilled topic instead of clustering it', () => {
    const slots = build(40)
    let runs = 0
    for (let i = 1; i < slots.length; i++) {
      if (slots[i].topicId === 't_weak' && slots[i - 1].topicId === 't_weak') runs++
    }
    expect(runs).toBeLessThanOrEqual(1)
  })

  it('carries the 5-10% stretch share through from the difficulty plan', () => {
    const slots = build(40)
    const stretch = slots.filter(s => s.stretch).length
    expect(stretch / 40).toBeGreaterThanOrEqual(0.05)
    expect(stretch / 40).toBeLessThanOrEqual(0.1)
  })

  it('gives every non-stretch slot the core difficulty', () => {
    for (const slot of build(20)) {
      expect(slot.difficulty).toBe(slot.stretch ? 9 : 7)
    }
  })

  it('handles a single-topic drill without dividing by zero', () => {
    const slots = buildBlueprint({
      topicIds: ['t_weak'], count: 15, band, mastery: MASTERY, recent: [], rng,
    })
    expect(slots.length).toBe(15)
    expect(new Set(slots.map(s => s.topicId))).toEqual(new Set(['t_weak']))
  })

  it('covers every topic in a two-topic block', () => {
    const slots = buildBlueprint({
      topicIds: ['t_weak', 't_strong'], count: 20, band, mastery: MASTERY, recent: [], rng,
    })
    expect(new Set(slots.map(s => s.topicId))).toEqual(new Set(['t_weak', 't_strong']))
  })

  it('is stable when there is no mastery data at all', () => {
    const slots = buildBlueprint({
      topicIds: TOPICS, count: 20, band, mastery: [], recent: [], rng,
    })
    expect(slots.length).toBe(20)
    const counts = new Map<string, number>()
    for (const s of slots) counts.set(s.topicId, (counts.get(s.topicId) ?? 0) + 1)
    expect(counts.size).toBe(TOPICS.length)
  })
})
