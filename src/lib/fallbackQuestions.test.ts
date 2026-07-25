import { describe, it, expect } from 'vitest'
import { FALLBACK_QUESTIONS, getFallbackQuestion } from './fallbackQuestions'
import { questionSignature, SeenQuestions } from './questionDedup'
import { getTopicById } from './curriculum'

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
