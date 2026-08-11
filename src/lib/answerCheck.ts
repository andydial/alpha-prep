import type { Question } from '../types'

/**
 * Answer handling shared by question generation and marking.
 *
 * Two production bugs live here:
 *
 * 1. The correct option was almost always B. Neither generator controls where
 *    the answer sits — the model has a strong positional bias toward the second
 *    option, and the offline bank was hand-written with 24 of 32 answers at A.
 *    `balanceOptions` takes the placement decision away from the generator.
 *
 * 2. Aarav was marked wrong for a right answer. The model asserts
 *    `correct_answer` and the app trusted it verbatim, even when the working
 *    shown underneath arrived at a different number.
 *    `answerConsistentWithWorking` catches that before the question is served,
 *    and `checkAnswer` fixes the label/format mismatches that caused the rest.
 */

const LABELS = ['A', 'B', 'C', 'D', 'E', 'F']

/** Leading option label in any of the styles the model emits: "A) ", "(B)", "C." */
const LABEL_PREFIX = /^\s*\(?\s*([A-Fa-f])\s*[).:\]]\s*/

/** A standalone option letter with no answer text: "B", "(C)", "D." */
const BARE_LETTER = /^\s*\(?\s*([A-Fa-f])\s*[).:\]]?\s*$/

export function stripLabel(s: string): string {
  return s.replace(LABEL_PREFIX, '').trim()
}

/** The option letter an answer refers to, if it is nothing but a letter. */
export function bareLetterIndex(s: string): number | null {
  const m = s.match(BARE_LETTER)
  if (!m) return null
  return LABELS.indexOf(m[1].toUpperCase())
}

function normaliseText(s: string): string {
  return stripLabel(s)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.,!?;:]+$/, '')
    .trim()
}

/**
 * Numeric value of an answer written the way a Year 6 student writes it:
 * "$12", "80 cm", "1,200", "25%", "3/4", "1 1/12". Null if it is not a number.
 */
function numericValue(s: string): number | null {
  const cleaned = stripLabel(s)
    .replace(/[$£€]/g, '')
    .replace(/,(?=\d{3}\b)/g, '')
    .trim()

  const mixed = cleaned.match(/^(-?\d+)\s+(\d+)\s*\/\s*(\d+)\b/)
  if (mixed) {
    const whole = Number(mixed[1])
    const frac = Number(mixed[2]) / Number(mixed[3])
    return whole < 0 ? whole - frac : whole + frac
  }

  const fraction = cleaned.match(/^(-?\d+)\s*\/\s*(\d+)\b/)
  if (fraction) {
    const denom = Number(fraction[2])
    return denom === 0 ? null : Number(fraction[1]) / denom
  }

  const plain = cleaned.match(/^-?\d*\.?\d+/)
  if (!plain) return null
  const value = Number(plain[0])
  return Number.isFinite(value) ? value : null
}

const EPSILON = 1e-9

/**
 * Did the student get it right? Tolerant of label style ("B) 80" vs "80" vs
 * "B"), casing, trailing punctuation, units, currency and equivalent number
 * formats — but never of a genuinely different value.
 */
export function checkAnswer(student: string, correct: string, options?: string[] | null): boolean {
  const studentRaw = (student ?? '').trim()
  const correctRaw = (correct ?? '').trim()
  if (!studentRaw || !correctRaw) return false

  const opts = options ?? []

  // Resolve bare-letter answers ("B") to the option they point at, so a
  // letter-only answer key does not fail against a full option string.
  const resolve = (s: string): string => {
    const idx = bareLetterIndex(s)
    if (idx !== null && idx >= 0 && idx < opts.length) return opts[idx]
    return s
  }

  const a = resolve(studentRaw)
  const b = resolve(correctRaw)

  // Both are bare letters that we could not resolve — compare the letters.
  const aLetter = bareLetterIndex(a)
  const bLetter = bareLetterIndex(b)
  if (aLetter !== null && bLetter !== null) return aLetter === bLetter

  if (normaliseText(a) === normaliseText(b)) return true

  const an = numericValue(a)
  const bn = numericValue(b)
  if (an !== null && bn !== null) return Math.abs(an - bn) < EPSILON

  return false
}

// ── Balanced answer placement ───────────────────────────────────────────────

/**
 * Slot bags, keyed by option count. Each bag is a shuffled permutation that is
 * drained before refilling, so the correct option lands in every position an
 * equal number of times — a per-question random draw would only be uniform on
 * average, and would still clump.
 */
const slotBags = new Map<number, number[]>()

export function resetAnswerSlots(): void {
  slotBags.clear()
}

export function nextAnswerSlot(size: number, rng: () => number = Math.random): number {
  if (size <= 1) return 0
  let bag = slotBags.get(size)
  if (!bag || bag.length === 0) {
    bag = Array.from({ length: size }, (_, i) => i)
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1))
      ;[bag[i], bag[j]] = [bag[j], bag[i]]
    }
    slotBags.set(size, bag)
  }
  return bag.pop()!
}

/**
 * Re-place and re-label a multiple-choice question's options so the correct one
 * sits in a slot chosen by the balanced cycle rather than wherever the
 * generator put it. Returns the question untouched if it is not multiple
 * choice, or if no option matches the answer key (that mismatch is caught
 * upstream — corrupting the question here would hide it).
 */
export function balanceOptions(q: Question, rng: () => number = Math.random): Question {
  if (q.type !== 'multiple_choice') return q
  const options = q.options ?? []
  if (options.length < 2) return q

  const texts = options.map(stripLabel)

  let correctIdx = bareLetterIndex(q.correct_answer)
  if (correctIdx === null || correctIdx < 0 || correctIdx >= options.length) {
    correctIdx = options.findIndex(opt => checkAnswer(opt, q.correct_answer, options))
  }
  if (correctIdx < 0) return q

  const correctText = texts[correctIdx]
  const distractors = texts.filter((_, i) => i !== correctIdx)

  for (let i = distractors.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[distractors[i], distractors[j]] = [distractors[j], distractors[i]]
  }

  const slot = nextAnswerSlot(options.length, rng)
  distractors.splice(slot, 0, correctText)

  const relabelled = distractors.map((text, i) => `${LABELS[i]}) ${text}`)

  return { ...q, options: relabelled, correct_answer: relabelled[slot] }
}

// ── Answer-key verification ─────────────────────────────────────────────────

/** Every number in a block of text, including fractions and mixed numbers. */
function numbersIn(text: string): number[] {
  const cleaned = text.replace(/[$£€]/g, '').replace(/,(?=\d{3}\b)/g, '')
  const tokens = cleaned.match(/-?\d+\s+\d+\s*\/\s*\d+|-?\d+\s*\/\s*\d+|-?\d*\.?\d+/g) ?? []
  return tokens
    .map(t => numericValue(t))
    .filter((n): n is number => n !== null)
}

/**
 * Does the stated answer actually follow from the working the model showed?
 *
 * This is the guard for the bug Aarav hit: the model wrote a sequence question,
 * asserted the answer was 82, then showed working that arrived at 80. A numeric
 * answer that appears nowhere in its own working is not safe to mark against.
 * Non-numeric answers are passed through — there is nothing reliable to check.
 */
export function answerConsistentWithWorking(correctAnswer: string, working: string): boolean {
  if (!working || !working.trim()) return true

  const answerNumbers = numbersIn(stripLabel(correctAnswer ?? ''))
  if (answerNumbers.length === 0) return true

  const workingNumbers = numbersIn(working)
  if (workingNumbers.length === 0) return true

  return answerNumbers.every(a => workingNumbers.some(w => Math.abs(a - w) < 1e-6))
}
