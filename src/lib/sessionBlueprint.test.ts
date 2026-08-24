import { describe, it, expect } from 'vitest'
import { buildBlueprint } from './weakness'
import { getDifficultyBand } from './examSpec'
import {
  EXAM_DOMAINS, TOPICS, DOMAIN_NAMES, examTopicsForDomain, getTopicById,
  POST_MIGRATION_TOPIC_IDS,
} from './curriculum'
import type { Domain, Mastery } from '../types'

/**
 * The blueprint against the real curriculum, not synthetic topic ids.
 *
 * This is the check that a session Aarav actually sits stays inside its exam
 * section, covers enough of it, and carries the stretch tail — the three things
 * the old per-question random topic draw could not guarantee.
 */

function mastery(topicId: string, attempts: number, score: number): Mastery {
  return {
    id: topicId, student_id: 's', topic_id: topicId, last_updated: '',
    attempts_total: attempts, attempts_correct: Math.round(attempts * score),
    score_7day: score, score_alltime: score, current_difficulty: 6,
  }
}

/** Aarav strong everywhere except one deliberately weak topic per section. */
const WEAK_TOPIC: Record<string, string> = {
  maths: 'maths_algebra',
  reading: 'reading_inference',
  verbal: 'verbal_analogies',
  numerical: 'numerical_properties',
}

const MASTERY: Mastery[] = TOPICS
  .filter(t => t.active)
  .map(t => mastery(t.id, 20, Object.values(WEAK_TOPIC).includes(t.id) ? 0.25 : 0.85))

const band = getDifficultyBand(6, 0)

/** Post-migration Supabase: every topic in src/lib/curriculum.ts exists. */
const ALL_TOPIC_IDS = new Set(TOPICS.map(t => t.id))

describe('a planned session against the real curriculum', () => {
  for (const domain of EXAM_DOMAINS) {
    describe(DOMAIN_NAMES[domain], () => {
      const topicIds = examTopicsForDomain(domain, ALL_TOPIC_IDS)

      it('draws every question from its own exam section', () => {
        const slots = buildBlueprint({ topicIds, count: 20, band, mastery: MASTERY, recent: [] })
        for (const slot of slots) {
          expect(getTopicById(slot.topicId)?.domain).toBe(domain)
        }
      })

      it('covers at least three topics and never lets one take over', () => {
        const slots = buildBlueprint({ topicIds, count: 20, band, mastery: MASTERY, recent: [] })
        const counts = new Map<string, number>()
        for (const s of slots) counts.set(s.topicId, (counts.get(s.topicId) ?? 0) + 1)
        expect(counts.size).toBeGreaterThanOrEqual(Math.min(3, topicIds.length))
        expect(Math.max(...counts.values())).toBeLessThanOrEqual(8) // 40% of 20
      })

      it('drills the weak topic harder than the even spread, but only by 1-3', () => {
        const slots = buildBlueprint({ topicIds, count: 20, band, mastery: MASTERY, recent: [] })
        const weak = WEAK_TOPIC[domain]
        const even = Math.floor(20 / topicIds.length)
        const got = slots.filter(s => s.topicId === weak).length
        expect(got - even).toBeGreaterThanOrEqual(1)
        expect(got - even).toBeLessThanOrEqual(3)
      })

      it('keeps the stretch share between 5% and 10%', () => {
        const slots = buildBlueprint({ topicIds, count: 20, band, mastery: MASTERY, recent: [] })
        const stretch = slots.filter(s => s.stretch).length
        expect(stretch / 20).toBeGreaterThanOrEqual(0.05)
        expect(stretch / 20).toBeLessThanOrEqual(0.1)
      })

      it('sits every question inside the difficulty floor and ceiling', () => {
        const slots = buildBlueprint({ topicIds, count: 40, band, mastery: MASTERY, recent: [] })
        for (const s of slots) {
          expect(s.difficulty).toBeGreaterThanOrEqual(5)
          expect(s.difficulty).toBeLessThanOrEqual(10)
        }
      })
    })
  }

  it('never plans an abstract-reasoning question — that section is not on the paper', () => {
    for (const domain of EXAM_DOMAINS) {
      const slots = buildBlueprint({
        topicIds: examTopicsForDomain(domain, ALL_TOPIC_IDS),
        count: 40, band, mastery: MASTERY, recent: [],
      })
      for (const s of slots) {
        expect(getTopicById(s.topicId)?.domain).not.toBe('abstract')
      }
    }
  })

  it('falls back to already-seeded topics when the migration has not been run', () => {
    // Pre-migration Supabase: only the original 25 topic ids exist.
    const preMigration = new Set(TOPICS.map(t => t.id).filter(id =>
      !id.startsWith('numerical_') && id !== 'verbal_logical_deduction' && id !== 'verbal_codes'))

    for (const domain of EXAM_DOMAINS) {
      const topicIds = examTopicsForDomain(domain, preMigration)
      expect(topicIds.length).toBeGreaterThanOrEqual(2)
      for (const id of topicIds) expect(preMigration.has(id)).toBe(true)

      const slots = buildBlueprint({ topicIds, count: 20, band, mastery: MASTERY, recent: [] })
      expect(slots).toHaveLength(20)
      // Every planned topic must exist in the database, or the attempts insert
      // fails on the foreign key.
      for (const s of slots) expect(preMigration.has(s.topicId)).toBe(true)
    }
  })

  it('keeps a two-block planned session inside its two sections', () => {
    const pair: [Domain, Domain] = ['reading', 'numerical']
    const half = 20
    const slots = [
      ...buildBlueprint({ topicIds: examTopicsForDomain(pair[0], ALL_TOPIC_IDS), count: half, band, mastery: MASTERY, recent: [] }),
      ...buildBlueprint({ topicIds: examTopicsForDomain(pair[1], ALL_TOPIC_IDS), count: half, band, mastery: MASTERY, recent: [] }),
    ]
    expect(slots).toHaveLength(40)
    for (let i = 0; i < 40; i++) {
      expect(getTopicById(slots[i].topicId)?.domain).toBe(i < half ? pair[0] : pair[1])
    }
  })
})

describe('foreign-key safety before the migration has run', () => {
  it('excludes the new topic ids when the topics table cannot be read', () => {
    // null means "unknown", which is also the pre-migration state — the
    // migration is what grants the read policy. Guessing optimistically would
    // send an unknown topic_id into attempts.topic_id and lose the row.
    for (const domain of EXAM_DOMAINS) {
      const topicIds = examTopicsForDomain(domain, null)
      expect(topicIds.length).toBeGreaterThanOrEqual(2)
      for (const id of topicIds) {
        expect(POST_MIGRATION_TOPIC_IDS.has(id)).toBe(false)
      }
    }
  })

  it('uses the new topics once the table confirms they exist', () => {
    const verbal = examTopicsForDomain('verbal', ALL_TOPIC_IDS)
    expect(verbal).toContain('verbal_logical_deduction')
    expect(verbal).toContain('verbal_codes')
    const numerical = examTopicsForDomain('numerical', ALL_TOPIC_IDS)
    expect(numerical).toContain('numerical_arithmetic')
  })

  it('still builds a full, on-domain session with the pre-migration topic list', () => {
    // Numerical Reasoning is the thinnest case: only two seeded topics until
    // the migration runs. It must still produce 20 usable slots.
    for (const domain of EXAM_DOMAINS) {
      const topicIds = examTopicsForDomain(domain, null)
      const slots = buildBlueprint({ topicIds, count: 20, band, mastery: MASTERY, recent: [] })
      expect(slots).toHaveLength(20)
      for (const s of slots) {
        expect(getTopicById(s.topicId)?.domain).toBe(domain)
        expect(POST_MIGRATION_TOPIC_IDS.has(s.topicId)).toBe(false)
      }
    }
  })
})
