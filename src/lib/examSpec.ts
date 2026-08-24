import type { Domain } from '../types'

/**
 * What the EDSC Alpha entrance test actually is, in one place.
 *
 * The Alpha selection test at East Doncaster Secondary College is an **EduTest**
 * paper for Year 6 students entering Year 7 — not an ACER paper. That distinction
 * changes what we should be generating:
 *
 *   - Five sections: Verbal Reasoning, Numerical Reasoning, Reading Comprehension,
 *     Mathematics (30 min each) and Written Expression (15 min).
 *   - Every non-writing question is MULTIPLE CHOICE with four options.
 *   - Pace is roughly 60 seconds per question — speed matters as much as accuracy.
 *   - There is NO abstract / spatial / non-verbal reasoning section.
 *
 * Everything the AI is told about the exam flows from the constants below.
 */

export interface ExamSection {
  domain: Domain
  label: string
  minutes: number
  blurb: string
}

/** The real paper, in the order it is sat. */
export const EXAM_SECTIONS: ExamSection[] = [
  {
    domain: 'verbal',
    label: 'Verbal Reasoning',
    minutes: 30,
    blurb: 'Ability — vocabulary, analogies, classification, deduction, codes',
  },
  {
    domain: 'numerical',
    label: 'Numerical Reasoning',
    minutes: 30,
    blurb: 'Ability — series, matrices, number properties, worded logic',
  },
  {
    domain: 'reading',
    label: 'Reading Comprehension',
    minutes: 30,
    blurb: 'Achievement — literal, inferential and critical reading',
  },
  {
    domain: 'maths',
    label: 'Mathematics',
    minutes: 30,
    blurb: 'Achievement — number & algebra, measurement & geometry, statistics & probability',
  },
  {
    domain: 'writing',
    label: 'Written Expression',
    minutes: 15,
    blurb: 'Achievement — one narrative or persuasive task, no planning time',
  },
]

// ── Difficulty band ─────────────────────────────────────────────────────────

/**
 * Core difficulty by prep week.
 *
 * The scale is re-anchored to the EduTest paper: 5 is a routine item at this
 * year level, 7 is a hard item, 9-10 separates the strongest candidates. The
 * ramp tops out at 7 rather than 8-10, because a paper where every question is
 * elite is not the paper Aarav will sit — the stretch share below is what
 * supplies the hard tail.
 */
const CORE_BY_WEEK: Record<number, number> = { 1: 5, 2: 5, 3: 6, 4: 6, 5: 6, 6: 7, 7: 7, 8: 7 }

export interface DifficultyBand {
  core: number
  stretch: number
}

export function getDifficultyBand(weekNumber: number, offset: number): DifficultyBand {
  const base = CORE_BY_WEEK[weekNumber] ?? 6
  const core = Math.max(5, Math.min(10, base + offset))
  return { core, stretch: Math.min(10, core + 2) }
}

export interface DifficultySlot {
  difficulty: number
  stretch: boolean
}

/** Indices that could take a stretch question without touching another one. */
function placeableIndices(count: number, chosen: ReadonlySet<number>): number[] {
  const out: number[] = []
  for (let i = 1; i <= count - 1; i++) {
    if (!chosen.has(i) && !chosen.has(i - 1) && !chosen.has(i + 1)) out.push(i)
  }
  return out
}

/**
 * The difficulty shape of one session.
 *
 * The real paper is overwhelmingly at-level with a short hard tail, so about 8%
 * of slots are pushed two levels above core and the rest sit exactly at core —
 * enough stretch to prepare him for the hardest items, not so much that the
 * session stops resembling the exam.
 *
 * A stretch question never opens a session (a cold first question that is the
 * hardest of the set reads as punishing) and two never sit back to back.
 */
export function buildDifficultyPlan(
  count: number,
  band: DifficultyBand,
  rng: () => number = Math.random,
): DifficultySlot[] {
  const slots: DifficultySlot[] = Array.from({ length: count }, () => ({
    difficulty: band.core,
    stretch: false,
  }))
  if (count < 2) return slots

  const stretchCount = Math.min(
    Math.floor(count * 0.1),
    Math.max(count >= 10 ? 1 : 0, Math.round(count * 0.08)),
  )
  if (stretchCount <= 0) return slots

  const segment = (count - 1) / stretchCount
  const chosen = new Set<number>()

  for (let i = 0; i < stretchCount; i++) {
    const pool = placeableIndices(count, chosen)
    if (pool.length === 0) break
    const lo = Math.max(1, Math.floor(1 + i * segment))
    const hi = Math.min(count - 1, Math.floor(1 + (i + 1) * segment) - 1)
    const inSegment = pool.filter(idx => idx >= lo && idx <= hi)
    const from = inSegment.length > 0 ? inSegment : pool
    chosen.add(from[Math.floor(rng() * from.length) % from.length])
  }

  for (const idx of chosen) slots[idx] = { difficulty: band.stretch, stretch: true }
  return slots
}

// ── Prompt material ─────────────────────────────────────────────────────────

/** Prose block injected into every generation prompt. */
export const EXAM_CONTEXT = `TARGET EXAM — EVERY QUESTION MUST LOOK LIKE IT CAME OFF THIS PAPER:
The EDSC Alpha entrance test (East Doncaster Secondary College, Victoria) is an EduTest paper sat by Year 6 students for Year 7 entry. It has five separately timed sections:
  1. Verbal Reasoning — 30 minutes
  2. Numerical Reasoning — 30 minutes
  3. Reading Comprehension — 30 minutes
  4. Mathematics — 30 minutes
  5. Written Expression — 15 minutes, one prompt, no planning time
Every question in sections 1-4 is multiple choice with four options. A candidate has roughly 60 SECONDS per question and no calculator. There is NO abstract, spatial or non-verbal pattern section on this paper — never generate one.`

/** Section-level generation guidance, keyed by domain. */
export const DOMAIN_GUIDANCE: Record<Exclude<Domain, 'abstract'>, string> = {
  verbal: `Verbal Reasoning (ability, 30 min). Item types on the real paper: synonyms and antonyms; analogies of the form "A is to B as C is to ?"; classification and odd-one-out; logical deduction from two or three short statements; letter codes and word codes; sentence completion. Vocabulary should stretch a strong Year 6 reader without being obscure. The question must be solvable from the words alone — never require knowledge of a specific book, film or curriculum topic.`,

  numerical: `Numerical Reasoning (ability, 30 min). This is REASONING, not curriculum recall — no formulas, no geometry diagrams, no unit-conversion drills. Item types on the real paper: number series and sequences (arithmetic, geometric, alternating, or driven by second differences); number matrices and grids where one rule links the numbers in every row or column; arithmetic reasoning in words (rates, ages, averages, sharing, proportion); number properties and relationships (factors, multiples, primes, divisibility, odd/even structure). The candidate must be able to spot the rule and apply it inside a minute, mentally or with minimal jotting.`,

  reading: `Reading Comprehension (achievement, 30 min). The real paper gives a short passage then several questions on it. Passages rotate between literary (narrative extract), informational (factual article) and persuasive (opinion piece). Question types: literal retrieval, inference and deduction, vocabulary in context, author purpose and tone, and text structure or feature. Every question must be answerable from the passage alone, and each distractor must be a reading a careless student would plausibly make.`,

  maths: `Mathematics (achievement, 30 min). Victorian Curriculum Year 6-7 content across number and algebra, measurement and geometry, and statistics and probability. Worded and usually multi-step, but reachable in under a minute by a strong student with no calculator. Use realistic Australian contexts (dollars and cents, metres and kilometres, litres, 24-hour time). Distractors should be the answers you get from the common slips: wrong operation, forgotten step, unconverted unit.`,

  writing: `Written Expression (achievement, 15 min). One prompt only, either narrative or persuasive, with no planning time. The prompt must be a single sentence or short scenario that any Year 6 student can open immediately with no specialist knowledge, and must leave room for a strong writer to show ideas, structure, vocabulary and control of conventions.`,
}

/** One-line item-type note per topic, so each topic generates its own shape of question. */
export const TOPIC_GUIDANCE: Record<string, string> = {
  // Mathematics
  maths_number_sense: 'Multi-step whole-number and decimal operations, order of operations, estimation to check a result.',
  maths_fractions: 'Fractions and decimals — comparing, ordering, and operating with unlike denominators inside a worded context.',
  maths_percentages: 'Percentage increase and decrease, discounts, ratio sharing, and converting between percentage, fraction and decimal.',
  maths_algebra: 'Patterns and rules — find the rule for a growing pattern, substitute into a simple expression, or solve a one- or two-step equation.',
  maths_geometry: 'Perimeter, area, volume, angle facts, and properties of 2D and 3D shapes, usually needing two steps.',
  maths_data: 'Reading a table, column graph or line graph; mean, median, mode and range; simple probability as a fraction.',
  maths_word_problems: 'Multi-step worded problems that mix operations — the difficulty is in working out what to do, not the arithmetic.',
  maths_time_money: 'Timetables, elapsed time, 24-hour time, money calculations and unit conversion inside a realistic scenario.',

  // Reading
  reading_main_idea: 'Identify the main idea, the best summary, or the best title for the passage.',
  reading_inference: 'Deduce something the passage implies but never states — a character\'s motive, a likely outcome, an unstated cause.',
  reading_vocabulary: 'Work out what a specific word or phrase means as it is used in this passage, not in general.',
  reading_author_intent: 'Identify the author\'s purpose, tone, attitude, or the persuasive technique being used.',
  reading_text_structure: 'Identify how the text is organised, why a paragraph or feature is placed where it is, or what a structural choice achieves.',

  // Verbal Reasoning
  verbal_analogies: 'An analogy of the form "A is to B as C is to ?" — the relationship should need thought (function, degree, part-whole, cause-effect), not just a synonym.',
  verbal_antonyms: 'Choose the closest synonym or the true opposite of a given word. Distractors should be near-misses in meaning.',
  verbal_odd_one_out: 'Four words share a property and one does not. The grouping rule should be conceptual, not just topical.',
  verbal_word_relationships: 'Word pairs, part-whole and category relationships, or which word belongs with a given group and why.',
  verbal_sentence_completion: 'A sentence with one or two gaps where only one option keeps the sense and register consistent.',
  verbal_logical_deduction: 'Two or three short statements, then a conclusion. Ask which conclusion must be true, or arrange people/items in order from the clues.',
  verbal_codes: 'Letter-shift codes, letter-position codes, or a word substitution code — give worked examples then ask the candidate to encode or decode.',

  // Numerical Reasoning
  abstract_sequences: 'A number or letter series with one term missing. Rules include constant difference, constant ratio, alternating rules, and differences that themselves form a pattern.',
  abstract_pattern_matrix: 'A small grid of numbers where the same rule links the numbers in each row (or column). Give two complete rows, then ask for the missing value in the third.',
  numerical_arithmetic: 'A short worded logic problem — ages, sharing, rates, averages, working backwards from a total. Solvable in one or two mental steps.',
  numerical_properties: 'Factors, multiples, primes, divisibility rules, square numbers, odd/even structure — asked as a reasoning puzzle rather than a definition.',
  numerical_proportion: 'Rates, ratios, scaling up and down, and direct proportion — "if 3 machines take 12 minutes..." style reasoning.',

  // Written Expression
  writing_planning: 'Structure and planning of a written piece — the strongest opening, the best paragraph order, the most effective conclusion.',
  writing_persuasive: 'Persuasive technique — rhetorical questions, direct address, emotive language, evidence, appeals to the reader.',
  writing_narrative: 'Narrative craft — showing rather than telling, character, setting, pacing, dialogue, and effective openings and endings.',
}
