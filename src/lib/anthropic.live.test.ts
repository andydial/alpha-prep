import { describe, it, expect } from 'vitest'
import { generateQuestion, generateReadingSet, evaluateAnswer } from './anthropic'
import { answerConsistentWithWorking, balanceOptions, checkAnswer } from './answerCheck'
import type { Domain } from '../types'

/**
 * Live checks against the real Anthropic API. Skipped by default — these cost
 * money and need network. Run them with:
 *
 *   RUN_LIVE_TESTS=1 npx vitest run src/lib/anthropic.live.test.ts
 */
// Reached via globalThis: `process` is not typed in the browser tsconfig this
// file is built under, and `tsc -b` is part of the production build.
const runLive = (globalThis as { process?: { env?: Record<string, string | undefined> } })
  .process?.env?.RUN_LIVE_TESTS
const live = runLive ? describe : describe.skip

live('marking a question whose answer key is wrong', () => {
  // The exact question Aarav was marked wrong on: T(4) = 27, T(6) = 53,
  // sum = 80. The stored key said 82.
  const question = 'A sequence is defined by the rule: T(n) = n² + 3n − 1, where n is the position number starting at 1. What is the sum of the 4th term and the 6th term?'

  it('marks the student correct when the key is wrong and their answer is right', async () => {
    const verdict = await evaluateAnswer({
      question,
      correctAnswer: '82',        // the bad key
      studentAnswer: '80',        // the right answer
      topicName: 'Algebra & Patterns',
    })
    expect(verdict.correct).toBe(true)
    expect(verdict.keyDisputed).toBe(true)
    expect(checkAnswer(verdict.resolvedAnswer, '80')).toBe(true)
    expect(verdict.feedback).not.toMatch(/\b82\b/)
  }, 60_000)

  it('still marks a genuinely wrong answer wrong', async () => {
    const verdict = await evaluateAnswer({
      question,
      correctAnswer: '80',
      studentAnswer: '53',
      topicName: 'Algebra & Patterns',
    })
    expect(verdict.correct).toBe(false)
  }, 60_000)

  it('accepts an equivalent form of a right answer', async () => {
    const verdict = await evaluateAnswer({
      question: 'What is 2/5 of 3/4?',
      correctAnswer: '3/10',
      studentAnswer: '0.3',
      topicName: 'Fractions & Decimals',
    })
    expect(verdict.correct).toBe(true)
  }, 60_000)
})

live('generated questions carry working that supports the answer', () => {
  // One topic from each of the four multiple-choice EduTest sections.
  const topics: { topicId: string; topicName: string; domain: Domain }[] = [
    { topicId: 'maths_algebra', topicName: 'Patterns & Algebra', domain: 'maths' },
    { topicId: 'maths_word_problems', topicName: 'Multi-step Word Problems', domain: 'maths' },
    { topicId: 'reading_inference', topicName: 'Inference & Deduction', domain: 'reading' },
    { topicId: 'verbal_analogies', topicName: 'Word Analogies', domain: 'verbal' },
    { topicId: 'verbal_logical_deduction', topicName: 'Logical Deduction', domain: 'verbal' },
    { topicId: 'numerical_arithmetic', topicName: 'Arithmetic Reasoning & Worded Logic', domain: 'numerical' },
    { topicId: 'abstract_sequences', topicName: 'Number & Letter Sequences', domain: 'numerical' },
  ]

  for (const t of topics) {
    it(`${t.topicName}: answer follows the working and matches an option`, async () => {
      const q = await generateQuestion({
        ...t,
        difficulty: 7,
        previousQuestions: [],
        weekNumber: 3,
      })
      expect(q.working, 'model must show its working').toBeTruthy()
      expect(answerConsistentWithWorking(q.correct_answer, q.working ?? '')).toBe(true)
      // The EduTest paper is multiple choice only — the generator rejects
      // anything else, so a short-answer item here is a regression.
      expect(q.type).toBe('multiple_choice')
      expect(q.options).toHaveLength(4)
      const balanced = balanceOptions(q)
      expect(balanced.options).toContain(balanced.correct_answer)
    }, 90_000)
  }
})

live('reading comprehension comes as a passage with several questions on it', () => {
  it('returns one shared passage and questions across different reading skills', async () => {
    const topicIds = ['reading_main_idea', 'reading_inference', 'reading_vocabulary', 'reading_author_intent']
    const set = await generateReadingSet({
      topicIds,
      topicNames: topicIds,
      count: 4,
      difficulty: 7,
      weekNumber: 3,
      previousQuestions: [],
    })

    expect(set.length).toBeGreaterThanOrEqual(2)
    const passages = new Set(set.map(q => q.passage))
    expect(passages.size, 'every question shares one passage').toBe(1)
    expect([...passages][0]!.split(/\s+/).length).toBeGreaterThan(80)

    for (const q of set) {
      expect(q.type).toBe('multiple_choice')
      expect(q.options).toHaveLength(4)
      expect(topicIds).toContain(q.topic_id)
      const balanced = balanceOptions(q)
      expect(balanced.options).toContain(balanced.correct_answer)
    }
    // Different skills, not four rewordings of the same question.
    expect(new Set(set.map(q => q.topic_id)).size).toBeGreaterThan(1)
  }, 120_000)
})
