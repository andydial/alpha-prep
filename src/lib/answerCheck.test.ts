import { describe, it, expect, beforeEach } from 'vitest'
import {
  checkAnswer, balanceOptions, nextAnswerSlot, resetAnswerSlots,
  answerConsistentWithWorking,
} from './answerCheck'
import type { Question } from '../types'

function mc(options: string[], correct: string): Question {
  return {
    question: 'Q?',
    type: 'multiple_choice',
    options,
    correct_answer: correct,
    difficulty: 6,
    topic_id: 'maths_fractions',
    hint: 'h',
    explanation: 'e',
  }
}

describe('checkAnswer', () => {
  const opts = ['A) 27', 'B) 80', 'C) 82', 'D) 90']

  it('matches a labelled option against a bare correct answer', () => {
    expect(checkAnswer('B) 80', '80', opts)).toBe(true)
  })

  it('matches a labelled option against a bare-letter answer key', () => {
    // The generator sometimes returns just "B" as correct_answer — the old
    // string compare marked every choice wrong in that case.
    expect(checkAnswer('B) 80', 'B', opts)).toBe(true)
    expect(checkAnswer('C) 82', 'B', opts)).toBe(false)
  })

  it('matches "(C)" and "C." label styles', () => {
    expect(checkAnswer('C) 82', '(C)', opts)).toBe(true)
    expect(checkAnswer('C) 82', 'C.', opts)).toBe(true)
  })

  it('rejects a genuinely different answer', () => {
    expect(checkAnswer('B) 80', '82', opts)).toBe(false)
  })

  it('accepts equivalent numeric forms', () => {
    expect(checkAnswer('0.5', '.5')).toBe(true)
    expect(checkAnswer('80.0', '80')).toBe(true)
    expect(checkAnswer('$12', '12')).toBe(true)
    expect(checkAnswer('1,200', '1200')).toBe(true)
    expect(checkAnswer('80 cm', '80')).toBe(true)
  })

  it('ignores case, trailing punctuation and extra spacing in text answers', () => {
    expect(checkAnswer('  The Cat.', 'the cat')).toBe(true)
    expect(checkAnswer('dog', 'cat')).toBe(false)
  })
})

describe('nextAnswerSlot', () => {
  beforeEach(resetAnswerSlots)

  it('hands out every slot exactly once per cycle', () => {
    const cycle = [nextAnswerSlot(4), nextAnswerSlot(4), nextAnswerSlot(4), nextAnswerSlot(4)]
    expect([...cycle].sort()).toEqual([0, 1, 2, 3])
  })

  it('stays perfectly uniform over many questions', () => {
    const counts = [0, 0, 0, 0]
    for (let i = 0; i < 400; i++) counts[nextAnswerSlot(4)] += 1
    expect(counts).toEqual([100, 100, 100, 100])
  })
})

describe('balanceOptions', () => {
  beforeEach(resetAnswerSlots)

  it('spreads the correct option evenly across A/B/C/D', () => {
    // Every source question parks the answer at B, exactly like the live model.
    const counts = [0, 0, 0, 0]
    for (let i = 0; i < 400; i++) {
      const q = balanceOptions(mc(['A) w', 'B) right', 'C) x', 'D) y'], 'B) right'))
      const idx = (q.options ?? []).findIndex(o => o === q.correct_answer)
      counts[idx] += 1
    }
    expect(counts).toEqual([100, 100, 100, 100])
  })

  it('keeps labels sequential and correct_answer an exact option string', () => {
    for (let i = 0; i < 50; i++) {
      const q = balanceOptions(mc(['A) w', 'B) right', 'C) x', 'D) y'], 'B) right'))
      expect((q.options ?? []).map(o => o.slice(0, 2))).toEqual(['A)', 'B)', 'C)', 'D)'])
      expect(q.options).toContain(q.correct_answer)
      expect(q.correct_answer).toContain('right')
    }
  })

  it('preserves the full set of option texts', () => {
    const q = balanceOptions(mc(['A) w', 'B) right', 'C) x', 'D) y'], 'B) right'))
    const texts = (q.options ?? []).map(o => o.replace(/^[A-D]\)\s*/, '')).sort()
    expect(texts).toEqual(['right', 'w', 'x', 'y'])
  })

  it('handles a bare-letter answer key and rewrites it to the option text', () => {
    const q = balanceOptions(mc(['A) w', 'B) right', 'C) x', 'D) y'], 'B'))
    expect(q.correct_answer).toContain('right')
    expect(q.options).toContain(q.correct_answer)
  })

  it('handles unlabelled options', () => {
    const q = balanceOptions(mc(['w', 'right', 'x', 'y'], 'right'))
    expect((q.options ?? []).map(o => o.slice(0, 2))).toEqual(['A)', 'B)', 'C)', 'D)'])
    expect(q.correct_answer).toContain('right')
  })

  it('leaves non-MC questions untouched', () => {
    const q: Question = { ...mc([], 'x'), type: 'numeric', options: null, correct_answer: '80' }
    expect(balanceOptions(q)).toEqual(q)
  })

  it('leaves a question untouched when no option matches the key', () => {
    const q = mc(['A) w', 'B) x', 'C) y', 'D) z'], 'not-present')
    expect(balanceOptions(q)).toEqual(q)
  })
})

describe('answerConsistentWithWorking', () => {
  it('rejects the real-world failure: key 82, working arrives at 80', () => {
    expect(answerConsistentWithWorking(
      '82',
      'T(4) = 16 + 12 - 1 = 27, and T(6) = 36 + 18 - 1 = 53, so 27 + 53 = 80.',
    )).toBe(false)
  })

  it('accepts a key the working actually produces', () => {
    expect(answerConsistentWithWorking(
      '80',
      'T(4) = 16 + 12 - 1 = 27, and T(6) = 36 + 18 - 1 = 53, so 27 + 53 = 80.',
    )).toBe(true)
  })

  it('accepts numeric answers written with units or currency', () => {
    expect(answerConsistentWithWorking('$45', 'Total cost is 45 dollars.')).toBe(true)
    expect(answerConsistentWithWorking('45 cm', 'The perimeter is 45 cm.')).toBe(true)
  })

  it('accepts fractions and mixed numbers the working states', () => {
    const working = '7/8 = 21/24 and 2/3 = 16/24, so 21/24 - 16/24 = 5/24.'
    expect(answerConsistentWithWorking('5/24', working)).toBe(true)
    expect(answerConsistentWithWorking('7/24', working)).toBe(false)
    expect(answerConsistentWithWorking('1 1/12', '9/12 + 4/12 = 13/12 = 1 1/12.')).toBe(true)
  })

  it('passes non-numeric answers through — nothing reliable to check', () => {
    expect(answerConsistentWithWorking('optimistic', 'The tone is hopeful throughout.')).toBe(true)
  })

  it('passes when there is no working to check against', () => {
    expect(answerConsistentWithWorking('82', '')).toBe(true)
  })
})
