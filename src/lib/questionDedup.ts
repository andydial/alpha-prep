import type { Question } from '../types'

/**
 * Normalised fingerprint of a question, used to guarantee no repeats within a
 * session. Two questions collide only if they are the same question modulo
 * punctuation, casing, whitespace and number formatting — so "What is 3/4 + 1/3?"
 * and "what is 3/4+1/3" are correctly treated as the same question.
 */
export function questionSignature(q: Pick<Question, 'question'>): string {
  return q.question
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9+\-*/%. ]/g, '')
    .trim()
}

/**
 * Tracks which questions a session has already served. This is the hard
 * guarantee behind "never repeat within a test" — the AI prompt asks for
 * variety, but only this enforces it.
 */
export class SeenQuestions {
  private signatures = new Set<string>()

  has(q: Pick<Question, 'question'>): boolean {
    return this.signatures.has(questionSignature(q))
  }

  add(q: Pick<Question, 'question'>): void {
    this.signatures.add(questionSignature(q))
  }

  get size(): number {
    return this.signatures.size
  }

  clear(): void {
    this.signatures.clear()
  }

  /** Signature list, for feeding the "do not repeat" instruction to the model. */
  toArray(): string[] {
    return [...this.signatures]
  }
}
