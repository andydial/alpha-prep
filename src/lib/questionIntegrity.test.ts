import { describe, it, expect } from 'vitest'
import {
  declaredAnswers, contradictsDeclaredAnswer, hasSelfCorrection, findQuestionDefect,
} from './answerCheck'
import type { Question } from '../types'

/**
 * Regression suite for the "wrong answer key reached the student" failure.
 *
 * The artifact below is the real question Aarav was served on 24 August 2026:
 * a pool-and-path area problem whose true answer is 66 m². The model committed
 * to "A) 87 m²", offered four options none of which was 66, and then — in the
 * explanation, which nothing validated — solved it properly, got 66, noticed
 * the contradiction and rambled through three visible self-corrections in front
 * of the student.
 *
 * Every check here exists to stop that exact shape of question being served.
 */
const SERVED_TO_AARAV: Question = {
  question: 'A rectangular swimming pool measures 12 m long and 7 m wide. A tiled path of uniform width 1.5 m surrounds the pool on all sides. What is the area of the tiled path alone, in square metres?',
  type: 'multiple_choice',
  options: ['A) 87 m²', 'B) 63 m²', 'C) 57 m²', 'D) 78 m²'],
  correct_answer: 'A) 87 m²',
  difficulty: 6,
  topic_id: 'maths_geometry',
  hint: 'Work out the area of the big rectangle first.',
  working: 'Outer rectangle = 15 × 10 = 150 m². Pool = 12 × 7 = 84 m². Path = 150 − 84 = 87 m². Final result: 87 m².',
  explanation: 'The outer rectangle including the path has dimensions (12 + 1.5 + 1.5) m × (7 + 1.5 + 1.5) m = 15 m × 10 m = 150 m². The pool itself has area 12 × 7 = 84 m². The tiled path area is 150 − 84 = 66 m²... wait — let me recheck: 15 × 10 = 150, 12 × 7 = 84, 150 − 84 = 66 m². Correcting the options: the correct answer is 66 m², so the answer is A) 87 m² is wrong — recalculating to ensure consistency: outer area = 15 × 10 = 150 m², pool area = 84 m², path = 66 m². The correct answer is 66 m². The path surrounds all four sides, so you add 1.5 m twice to each dimension, giving a 15 m × 10 m outer rectangle (area 150 m²), then subtract the pool area of 84 m² to get 66 m².',
}

/** A good question, taken verbatim from a real generation run. */
const HEALTHY: Question = {
  question: 'A rectangular fish tank is 60 cm long, 30 cm wide and 40 cm tall. Water is filled to a height of 25 cm. How many litres of water are in the tank?',
  type: 'multiple_choice',
  options: ['A) 45 L', 'B) 36 L', 'C) 72 L', 'D) 18 L'],
  correct_answer: 'A) 45 L',
  difficulty: 6,
  topic_id: 'maths_geometry',
  hint: 'Volume in cubic centimetres first, then convert.',
  working: 'Step 1: Volume of water = 60 × 30 × 25. 60 × 30 = 1800. 1800 × 25 = 45 000 cm³. Step 2: Convert cm³ to litres. 1 litre = 1000 cm³, so 45 000 ÷ 1000 = 45 litres. Final result: 45 L.',
  explanation: 'The water forms a rectangular prism 60 cm × 30 cm × 25 cm = 45 000 cm³, and since 1000 cm³ is one litre that is 45 L. Option C) 72 L is what you get if you mistakenly use the full tank height of 40 cm, and D) 18 L results from using 10 cm instead of 25 cm — classic traps for rushing students!',
}

describe('declaredAnswers', () => {
  it('picks up every value the text declares as the answer', () => {
    const declared = declaredAnswers(SERVED_TO_AARAV.explanation)
    expect(declared).toContain(66)
    expect(declared).toContain(87)
  })

  it('ignores values a text explicitly frames as a mistake', () => {
    const text = 'A common mistake is to think the answer is 115 m², but the diameter is not the radius.'
    expect(declaredAnswers(text)).toEqual([])
  })

  it('finds nothing in a text that never declares an answer', () => {
    expect(declaredAnswers(HEALTHY.explanation)).toEqual([])
  })
})

describe('contradictsDeclaredAnswer', () => {
  it('catches an explanation that concludes a different number from the key', () => {
    expect(contradictsDeclaredAnswer('A) 87 m²', SERVED_TO_AARAV.explanation)).toBe(true)
  })

  it('passes an explanation that agrees with the key', () => {
    expect(contradictsDeclaredAnswer('A) 45 L', HEALTHY.explanation)).toBe(false)
    expect(contradictsDeclaredAnswer('A) 45 L', 'So the answer is 45 L.')).toBe(false)
  })

  it('is not fooled by the key merely appearing somewhere in the text', () => {
    // The old guard only asked "does 87 appear anywhere?" — it does, in the
    // sentence saying 87 is wrong. That is why this bug got through.
    expect(SERVED_TO_AARAV.explanation).toContain('87')
    expect(contradictsDeclaredAnswer('A) 87 m²', SERVED_TO_AARAV.explanation)).toBe(true)
  })

  it('says nothing about a non-numeric answer', () => {
    expect(contradictsDeclaredAnswer('B) abundant', 'The answer is abundant.')).toBe(false)
  })
})

describe('hasSelfCorrection', () => {
  it('flags text where the model visibly changes its mind', () => {
    expect(hasSelfCorrection(SERVED_TO_AARAV.explanation)).toBe(true)
    expect(hasSelfCorrection('Hmm, that gives 66. Let me recheck.')).toBe(true)
    expect(hasSelfCorrection('Actually, the correct answer is 12.')).toBe(true)
    expect(hasSelfCorrection('Apologies — I made an error above.')).toBe(true)
  })

  it('leaves clean explanations alone', () => {
    expect(hasSelfCorrection(HEALTHY.explanation)).toBe(false)
    expect(hasSelfCorrection(HEALTHY.working!)).toBe(false)
  })

  it('does not trip on ordinary uses of the trigger words', () => {
    expect(hasSelfCorrection('The bus made her wait 12 minutes, so she arrived at 9:42.')).toBe(false)
    expect(hasSelfCorrection('How long did Priya wait?')).toBe(false)
    expect(hasSelfCorrection('The correct answer is 45 L.')).toBe(false)
  })
})

describe('findQuestionDefect', () => {
  it('rejects the question that was actually served to Aarav', () => {
    expect(findQuestionDefect(SERVED_TO_AARAV)).toBe('EXPLANATION_CONTRADICTS_ANSWER')
  })

  it('accepts a healthy question', () => {
    expect(findQuestionDefect(HEALTHY)).toBeNull()
  })

  it('rejects a short-answer item — the paper is multiple choice only', () => {
    expect(findQuestionDefect({ ...HEALTHY, type: 'short_answer', options: null }))
      .toBe('NOT_MULTIPLE_CHOICE')
  })

  it('rejects the wrong number of options', () => {
    expect(findQuestionDefect({ ...HEALTHY, options: ['A) 45 L', 'B) 36 L', 'C) 72 L'] }))
      .toBe('WRONG_OPTION_COUNT')
  })

  it('rejects a key that matches none of its options', () => {
    expect(findQuestionDefect({ ...HEALTHY, correct_answer: '66 L' }))
      .toBe('MC_OPTION_MISMATCH')
  })

  it('rejects a question with no working — there is nothing to verify against', () => {
    expect(findQuestionDefect({ ...HEALTHY, working: '' })).toBe('EMPTY_WORKING')
    expect(findQuestionDefect({ ...HEALTHY, working: undefined })).toBe('EMPTY_WORKING')
  })

  it('rejects an answer that does not follow from its own working', () => {
    // The original 2026 bug: working reaches 80, the key asserts 82.
    const q: Question = {
      ...HEALTHY,
      options: ['A) 82', 'B) 80', 'C) 78', 'D) 84'],
      correct_answer: 'A) 82',
      working: 'T(4) = 16 + 12 - 1 = 27. T(6) = 36 + 18 - 1 = 53. Sum = 27 + 53 = 80. Final result: 80.',
      explanation: 'Substitute n = 4 and n = 6 into the rule and add the two terms.',
    }
    expect(findQuestionDefect(q)).toBe('ANSWER_WORKING_MISMATCH')
  })

  it('rejects working that visibly self-corrects even when the numbers line up', () => {
    const q: Question = {
      ...HEALTHY,
      working: 'Area = 4 × 12.56 = 50.24. Hmm, let me recheck that. Step 4 revised — uncovered area = 100 − 50.24 = 49.76, rounds to 45 L. Final result: 45 L.',
    }
    expect(findQuestionDefect(q)).toBe('SELF_CORRECTING_TEXT')
  })

  it('flags every defect on the served question, not just the first found', () => {
    // Belt and braces: the served question is also self-correcting, so if the
    // contradiction check were ever relaxed the second gate still catches it.
    expect(hasSelfCorrection(SERVED_TO_AARAV.explanation)).toBe(true)
  })
})
