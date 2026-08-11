import { describe, it, expect } from 'vitest'
import { generateQuestion, evaluateAnswer } from './anthropic'
import { answerConsistentWithWorking, balanceOptions, checkAnswer } from './answerCheck'

/**
 * Live checks against the real Anthropic API. Skipped by default — these cost
 * money and need network. Run them with:
 *
 *   RUN_LIVE_TESTS=1 npx vitest run src/lib/anthropic.live.test.ts
 */
const live = process.env.RUN_LIVE_TESTS ? describe : describe.skip

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
  const topics = [
    { topicId: 'maths_algebra', topicName: 'Algebra & Patterns' },
    { topicId: 'maths_word_problems', topicName: 'Word Problems & Logic' },
    { topicId: 'reading_inference', topicName: 'Inference & Deduction' },
    { topicId: 'verbal_analogies', topicName: 'Word Analogies' },
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
      if (q.type === 'multiple_choice') {
        const balanced = balanceOptions(q)
        expect(balanced.options).toContain(balanced.correct_answer)
      }
    }, 90_000)
  }
})
