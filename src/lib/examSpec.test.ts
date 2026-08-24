import { describe, it, expect } from 'vitest'
import { getDifficultyBand, buildDifficultyPlan, EXAM_SECTIONS, DOMAIN_GUIDANCE } from './examSpec'

describe('getDifficultyBand', () => {
  it('starts at exam level and ramps toward the exam', () => {
    expect(getDifficultyBand(1, 0).core).toBe(5)
    expect(getDifficultyBand(8, 0).core).toBe(7)
  })

  it('always puts stretch two above core, capped at 10', () => {
    for (let w = 1; w <= 8; w++) {
      const b = getDifficultyBand(w, 0)
      expect(b.stretch).toBe(Math.min(10, b.core + 2))
    }
  })

  it('applies the parent difficulty offset and clamps to 5..10', () => {
    expect(getDifficultyBand(1, -2).core).toBe(5)
    expect(getDifficultyBand(8, 2).core).toBe(9)
  })
})

describe('buildDifficultyPlan', () => {
  const band = { core: 7, stretch: 9 }

  it('returns exactly `count` slots', () => {
    expect(buildDifficultyPlan(40, band).length).toBe(40)
  })

  it('keeps stretch between 5% and 10% of the session', () => {
    for (const n of [10, 15, 20, 30, 40]) {
      const stretch = buildDifficultyPlan(n, band).filter(s => s.stretch).length
      expect(stretch / n).toBeGreaterThanOrEqual(0.05)
      expect(stretch / n).toBeLessThanOrEqual(0.1)
    }
  })

  it('never opens a session with a stretch question', () => {
    for (let i = 0; i < 200; i++) {
      expect(buildDifficultyPlan(20, band)[0].stretch).toBe(false)
    }
  })

  it('never places two stretch questions back to back', () => {
    for (let i = 0; i < 200; i++) {
      const plan = buildDifficultyPlan(40, band)
      for (let j = 1; j < plan.length; j++) {
        expect(plan[j].stretch && plan[j - 1].stretch).toBe(false)
      }
    }
  })

  it('gives every non-stretch slot the core difficulty', () => {
    for (const slot of buildDifficultyPlan(20, band)) {
      expect(slot.difficulty).toBe(slot.stretch ? 9 : 7)
    }
  })
})

describe('exam sections', () => {
  it('covers the five EduTest sections and excludes abstract reasoning', () => {
    expect(EXAM_SECTIONS.map(s => s.domain)).toEqual([
      'verbal', 'numerical', 'reading', 'maths', 'writing',
    ])
    expect(Object.keys(DOMAIN_GUIDANCE)).not.toContain('abstract')
  })
})
