import { describe, it, expect } from 'vitest'
import { getFallbackQuestion } from './fallbackQuestions'
import { SeenQuestions } from './questionDedup'
import { selectTopicFromDomain, getTopicById } from './curriculum'
import type { Domain } from '../types'

// Mirrors the real session shape: 40 questions, two 20-question domain blocks,
// topic chosen per question by selectTopicFromDomain, AI unavailable.
function simulate(pair: [Domain, Domain]) {
  const seen = new SeenQuestions()
  let offDomain = 0
  for (let n = 1; n <= 40; n++) {
    const domain = n <= 20 ? pair[0] : pair[1]
    const topicId = selectTopicFromDomain(domain, [])
    const q = getFallbackQuestion(topicId, new Set(seen.toArray()))
    if (!q) return { ok: false, served: seen.size, failedAt: n }
    if (seen.has(q)) return { ok: false, served: seen.size, repeatAt: n }
    if (getTopicById(q.topic_id)?.domain !== domain) offDomain++
    seen.add(q)
  }
  return { ok: true, served: seen.size, offDomain }
}

describe('full 40-question session with the AI unavailable', () => {
  // The four multiple-choice EduTest sections, in the pairs the weekly
  // rotation actually produces.
  const pairs: [Domain, Domain][] = [
    ['maths', 'verbal'], ['maths', 'reading'], ['maths', 'numerical'],
    ['reading', 'verbal'], ['numerical', 'verbal'], ['reading', 'numerical'],
  ]
  for (const pair of pairs) {
    it(`${pair[0]} + ${pair[1]}: serves 40 unique questions, zero repeats, zero off-domain`, () => {
      for (let run = 0; run < 50; run++) {
        // offDomain must be 0: getFallbackQuestion widens its search when a
        // topic runs dry, so a thin bank shows up as maths questions inside a
        // numerical block rather than as an error. The block must stay pure.
        expect(simulate(pair)).toEqual({ ok: true, served: 40, offDomain: 0 })
      }
    })
  }
})
