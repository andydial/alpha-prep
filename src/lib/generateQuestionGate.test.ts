import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { generateQuestion } from './anthropic'
import { findQuestionDefect } from './answerCheck'

/**
 * Proves the integrity gate is wired into generateQuestion, not merely present
 * in answerCheck.ts.
 *
 * The regression this guards: on 24 August 2026 Aarav was served a pool-and-path
 * question keyed to 87 m² whose own explanation worked out 66 m² — and 66 was
 * not among the four options. Every unit test on the validators can pass while
 * the generator quietly stops calling them, so this stubs the API and checks
 * the plumbing end to end.
 */

/** The exact response shape that reached Aarav. */
const BAD_RESPONSE = {
  question: 'A rectangular swimming pool measures 12 m long and 7 m wide. A tiled path of uniform width 1.5 m surrounds the pool on all sides. What is the area of the tiled path alone, in square metres?',
  type: 'multiple_choice',
  options: ['A) 87 m²', 'B) 63 m²', 'C) 57 m²', 'D) 78 m²'],
  working: 'Outer = 15 × 10 = 150 m². Pool = 12 × 7 = 84 m². Path = 150 − 84 = 87 m². Final result: 87 m².',
  correct_answer: 'A) 87 m²',
  difficulty: 6,
  topic_id: 'maths_geometry',
  hint: 'Find the big rectangle first.',
  explanation: 'The outer rectangle is 15 m × 10 m = 150 m². The pool has area 84 m². The tiled path area is 150 − 84 = 66 m²... wait — let me recheck. Correcting the options: the correct answer is 66 m².',
}

const GOOD_RESPONSE = {
  question: 'A rectangular fish tank is 60 cm long, 30 cm wide and 40 cm tall. Water is filled to a height of 25 cm. How many litres of water are in the tank?',
  type: 'multiple_choice',
  options: ['A) 45 L', 'B) 36 L', 'C) 72 L', 'D) 18 L'],
  working: 'Volume = 60 × 30 × 25 = 45 000 cm³. 45 000 ÷ 1000 = 45 litres. Final result: 45 L.',
  correct_answer: 'A) 45 L',
  difficulty: 6,
  topic_id: 'maths_geometry',
  hint: 'Work in cubic centimetres, then convert.',
  explanation: 'The water forms a prism 60 × 30 × 25 = 45 000 cm³, and 1000 cm³ is one litre, so 45 L. Option C is what you get using the full 40 cm height.',
}

function reply(payload: unknown) {
  return {
    ok: true,
    json: async () => ({ content: [{ type: 'text', text: JSON.stringify(payload) }] }),
  } as unknown as Response
}

const PARAMS = {
  topicId: 'maths_geometry',
  topicName: 'Measurement & Geometry',
  domain: 'maths' as const,
  difficulty: 6,
  previousQuestions: [],
  weekNumber: 7,
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.stubEnv('VITE_ANTHROPIC_API_KEY', 'test-key')
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('generateQuestion integrity gate', () => {
  it('never returns the question that was served to Aarav', async () => {
    fetchMock.mockResolvedValue(reply(BAD_RESPONSE))
    await expect(generateQuestion(PARAMS)).rejects.toThrow('EXPLANATION_CONTRADICTS_ANSWER')
  })

  it('retries after a defect and returns the corrected question', async () => {
    fetchMock
      .mockResolvedValueOnce(reply(BAD_RESPONSE))
      .mockResolvedValueOnce(reply(GOOD_RESPONSE))
    const q = await generateQuestion(PARAMS)
    expect(q.correct_answer).toBe('A) 45 L')
    expect(findQuestionDefect(q)).toBeNull()
  })

  it('tells the model what was wrong instead of repeating the same request', async () => {
    fetchMock
      .mockResolvedValueOnce(reply(BAD_RESPONSE))
      .mockResolvedValueOnce(reply(GOOD_RESPONSE))
    await generateQuestion(PARAMS)

    const firstBody = JSON.parse(fetchMock.mock.calls[0][1].body as string)
    const retryBody = JSON.parse(fetchMock.mock.calls[1][1].body as string)
    const firstPrompt = firstBody.messages[0].content as string
    const retryPrompt = retryBody.messages[0].content as string

    expect(firstPrompt).not.toContain('YOUR PREVIOUS ATTEMPT WAS REJECTED')
    expect(retryPrompt).toContain('YOUR PREVIOUS ATTEMPT WAS REJECTED')
    expect(retryPrompt).toContain('the explanation concluded a different answer')
  })

  it('rejects a short-answer item — the paper is multiple choice only', async () => {
    fetchMock.mockResolvedValue(reply({
      ...GOOD_RESPONSE, type: 'short_answer', options: null, correct_answer: '45 L',
    }))
    await expect(generateQuestion(PARAMS)).rejects.toThrow('NOT_MULTIPLE_CHOICE')
  })

  it('rejects a key that matches none of its options', async () => {
    fetchMock.mockResolvedValue(reply({ ...GOOD_RESPONSE, correct_answer: '66 L' }))
    await expect(generateQuestion(PARAMS)).rejects.toThrow('MC_OPTION_MISMATCH')
  })

  it('rejects an answer its own working never reached', async () => {
    fetchMock.mockResolvedValue(reply({
      ...GOOD_RESPONSE,
      options: ['A) 82', 'B) 80', 'C) 78', 'D) 84'],
      correct_answer: 'A) 82',
      working: 'T(4) = 27, T(6) = 53, sum = 27 + 53 = 80. Final result: 80.',
      explanation: 'Substitute n = 4 and n = 6 into the rule and add the terms.',
    }))
    await expect(generateQuestion(PARAMS)).rejects.toThrow('ANSWER_WORKING_MISMATCH')
  })

  it('rejects visible second thoughts even when the numbers agree', async () => {
    fetchMock.mockResolvedValue(reply({
      ...GOOD_RESPONSE,
      explanation: 'Volume is 45 000 cm³. Hmm, let me recheck that — yes, 45 L.',
    }))
    await expect(generateQuestion(PARAMS)).rejects.toThrow('SELF_CORRECTING_TEXT')
  })

  it('accepts a healthy question on the first attempt', async () => {
    fetchMock.mockResolvedValue(reply(GOOD_RESPONSE))
    const q = await generateQuestion(PARAMS)
    expect(findQuestionDefect(q)).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('gives up after three attempts rather than serving a defective question', async () => {
    fetchMock.mockResolvedValue(reply(BAD_RESPONSE))
    await expect(generateQuestion(PARAMS)).rejects.toThrow()
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})

/**
 * The second half of the 24 August failure.
 *
 * The marker had one attempt and a 700-token cap with barely any headroom
 * (measured output ran 430-600). When it failed it returned the *unverified*
 * generated key with empty feedback and no signal at all, so the UI showed a
 * wrong answer key as settled fact next to the question's own rambling
 * explanation. It must retry, and when it truly cannot run it must say so.
 */
describe('evaluateAnswer resilience', () => {
  const MARK_PARAMS = {
    question: 'A rectangular swimming pool measures 12 m long and 7 m wide. A tiled path of uniform width 1.5 m surrounds the pool. What is the area of the path?',
    correctAnswer: 'A) 87 m²',
    studentAnswer: 'B) 63 m²',
    topicName: 'Measurement & Geometry',
    options: ['A) 87 m²', 'B) 63 m²', 'C) 57 m²', 'D) 78 m²'],
  }

  function verdictReply(payload: unknown, stop_reason = 'end_turn') {
    return {
      ok: true,
      json: async () => ({ content: [{ type: 'text', text: JSON.stringify(payload) }], stop_reason }),
    } as unknown as Response
  }

  const MARKER_OUTPUT = {
    working: 'Outer 15 × 10 = 150. Pool 12 × 7 = 84. Path = 66 m².',
    independent_answer: '66 m²',
    key_matches_working: false,
    correct: false,
    feedback: 'Close — the outer rectangle is 15 m × 10 m, so the path is 66 m².',
  }

  it('flags markerUnavailable when it cannot reach the marker at all', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 529 } as unknown as Response)
    const { evaluateAnswer } = await import('./anthropic')
    const verdict = await evaluateAnswer(MARK_PARAMS)
    expect(verdict.markerUnavailable).toBe(true)
    expect(verdict.feedback).toBe('')
    // It still falls back to the key, but the caller now knows it is unchecked.
    expect(verdict.resolvedAnswer).toBe('A) 87 m²')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('retries a truncated response instead of silently trusting the key', async () => {
    fetchMock
      .mockResolvedValueOnce(verdictReply({ working: 'Outer 15 × 10 = 150. Pool' }, 'max_tokens'))
      .mockResolvedValueOnce(verdictReply(MARKER_OUTPUT))
    const { evaluateAnswer } = await import('./anthropic')
    const verdict = await evaluateAnswer(MARK_PARAMS)
    expect(verdict.markerUnavailable).toBe(false)
    expect(verdict.keyDisputed).toBe(true)
    expect(verdict.resolvedAnswer).toBe('66 m²')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('overrides a wrong key with its own derived answer', async () => {
    fetchMock.mockResolvedValue(verdictReply(MARKER_OUTPUT))
    const { evaluateAnswer } = await import('./anthropic')
    const verdict = await evaluateAnswer(MARK_PARAMS)
    expect(verdict.resolvedAnswer).toBe('66 m²')
    expect(verdict.keyDisputed).toBe(true)
    expect(verdict.markerUnavailable).toBe(false)
  })

  it('marks the student correct when the key was wrong and they were right', async () => {
    fetchMock.mockResolvedValue(verdictReply({ ...MARKER_OUTPUT, correct: true }))
    const { evaluateAnswer } = await import('./anthropic')
    const verdict = await evaluateAnswer({ ...MARK_PARAMS, studentAnswer: '66' })
    expect(verdict.correct).toBe(true)
  })
})
