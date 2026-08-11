import { describe, it, expect, beforeEach } from 'vitest'
import { FALLBACK_QUESTIONS, getFallbackQuestion } from './fallbackQuestions'
import { questionSignature, SeenQuestions } from './questionDedup'
import { getTopicById } from './curriculum'
import { balanceOptions, checkAnswer, resetAnswerSlots } from './answerCheck'

describe('offline question bank integrity', () => {
  it('contains no duplicate questions', () => {
    const sigs = FALLBACK_QUESTIONS.map(questionSignature)
    expect(new Set(sigs).size).toBe(FALLBACK_QUESTIONS.length)
  })

  it('never drops below the difficulty floor of 5', () => {
    const tooEasy = FALLBACK_QUESTIONS.filter(q => q.difficulty < 5 || q.difficulty > 10)
    expect(tooEasy).toEqual([])
  })

  it('references only real curriculum topics', () => {
    const unknown = FALLBACK_QUESTIONS
      .map(q => q.topic_id)
      .filter(id => !getTopicById(id))
    expect(unknown).toEqual([])
  })

  it('gives every multiple-choice question an answer that matches an option', () => {
    const broken = FALLBACK_QUESTIONS.filter(q => {
      if (q.type !== 'multiple_choice') return false
      const opts = q.options ?? []
      return !opts.some(o => o.trim() === q.correct_answer.trim())
    })
    expect(broken.map(q => q.question)).toEqual([])
  })
})

describe('answer position across a served session', () => {
  beforeEach(resetAnswerSlots)

  it('the raw bank is badly skewed — which is why serving must rebalance it', () => {
    const raw = [0, 0, 0, 0]
    for (const q of FALLBACK_QUESTIONS) {
      if (q.type !== 'multiple_choice') continue
      raw[(q.options ?? []).findIndex(o => o.trim() === q.correct_answer.trim())] += 1
    }
    expect(Math.max(...raw)).toBeGreaterThan(raw.reduce((a, b) => a + b, 0) / 2)
  })

  it('serves the correct option evenly across A–D once rebalanced', () => {
    const served = [0, 0, 0, 0]
    for (let run = 0; run < 20; run++) {
      const seen = new SeenQuestions()
      for (let i = 0; i < 20; i++) {
        const raw = getFallbackQuestion('maths_fractions', new Set(seen.toArray()))
        if (!raw) break
        seen.add(raw)
        if (raw.type !== 'multiple_choice') continue
        const q = balanceOptions(raw)
        served[(q.options ?? []).indexOf(q.correct_answer)] += 1
      }
    }
    const total = served.reduce((a, b) => a + b, 0)
    expect(total).toBeGreaterThan(40)
    // Perfectly even bar the partial cycle at the end of the run
    for (const count of served) {
      expect(Math.abs(count - total / 4)).toBeLessThanOrEqual(1)
    }
  })

  it('keeps every rebalanced answer key an exact option string', () => {
    for (const raw of FALLBACK_QUESTIONS) {
      if (raw.type !== 'multiple_choice') continue
      const q = balanceOptions(raw)
      expect(q.options, q.question).toContain(q.correct_answer)
      expect(checkAnswer(q.correct_answer, q.correct_answer, q.options)).toBe(true)
    }
  })
})

describe('getFallbackQuestion never repeats within a session', () => {
  it('returns a distinct question every call until the bank is exhausted', () => {
    const seen = new SeenQuestions()
    const picked: string[] = []

    for (let i = 0; i < FALLBACK_QUESTIONS.length; i++) {
      const q = getFallbackQuestion('maths_fractions', new Set(seen.toArray()))
      expect(q, `exhausted early at call ${i + 1}`).not.toBeNull()
      expect(seen.has(q!)).toBe(false)
      seen.add(q!)
      picked.push(questionSignature(q!))
    }

    expect(new Set(picked).size).toBe(FALLBACK_QUESTIONS.length)
  })

  it('returns null rather than repeating once the bank is exhausted', () => {
    const all = new Set(FALLBACK_QUESTIONS.map(questionSignature))
    expect(getFallbackQuestion('maths_fractions', all)).toBeNull()
  })

  it('supplies a full 40-question session without repeating', () => {
    const seen = new SeenQuestions()
    for (let i = 0; i < 40; i++) {
      const q = getFallbackQuestion('verbal_analogies', new Set(seen.toArray()))
      expect(q, `repeat-free run failed at question ${i + 1}`).not.toBeNull()
      seen.add(q!)
    }
    expect(seen.size).toBe(40)
  })

  it('prefers the requested topic before widening', () => {
    const q = getFallbackQuestion('maths_fractions', new Set())
    expect(q!.topic_id).toBe('maths_fractions')
  })
})

describe('questionSignature', () => {
  it('treats reworded-but-identical questions as the same', () => {
    expect(questionSignature({ question: 'What is 3/4 + 1/3?' }))
      .toBe(questionSignature({ question: '  what is   3/4 + 1/3  ' }))
  })

  it('treats genuinely different questions as different', () => {
    expect(questionSignature({ question: 'What is 3/4 + 1/3?' }))
      .not.toBe(questionSignature({ question: 'What is 7/8 - 2/3?' }))
  })
})
