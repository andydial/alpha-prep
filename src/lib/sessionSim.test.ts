import { describe, it, expect } from 'vitest'
import { getFallbackQuestion } from './fallbackQuestions'
import { SeenQuestions } from './questionDedup'
import { selectTopicFromDomain } from './curriculum'
import type { Domain } from '../types'

// Mirrors the real session shape: 40 questions, two 20-question domain blocks,
// topic chosen per question by selectTopicFromDomain, AI unavailable.
function simulate(pair: [Domain, Domain]) {
  const seen = new SeenQuestions()
  for (let n = 1; n <= 40; n++) {
    const domain = n <= 20 ? pair[0] : pair[1]
    const topicId = selectTopicFromDomain(domain, [])
    const q = getFallbackQuestion(topicId, new Set(seen.toArray()))
    if (!q) return { ok: false, served: seen.size, failedAt: n }
    if (seen.has(q)) return { ok: false, served: seen.size, repeatAt: n }
    seen.add(q)
  }
  return { ok: true, served: seen.size }
}

describe('full 40-question session with the AI unavailable', () => {
  const pairs: [Domain, Domain][] = [
    ['maths', 'verbal'], ['maths', 'reading'], ['maths', 'abstract'],
    ['reading', 'verbal'], ['abstract', 'verbal'], ['reading', 'abstract'],
  ]
  for (const pair of pairs) {
    it(`${pair[0]} + ${pair[1]}: serves 40 unique questions, zero repeats`, () => {
      for (let run = 0; run < 50; run++) {
        expect(simulate(pair)).toEqual({ ok: true, served: 40 })
      }
    })
  }
})
