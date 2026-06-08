import type { Topic, Mastery, WeeklyPlan, LevelInfo, Domain, DomainPair } from '../types'

// ── Constants ──────────────────────────────────────────────────────────────

export const DIFFICULTY_FLOOR = 5
export const DIFFICULTY_CEILING = 10
export const DIFFICULTY_DEFAULT = 6

export const DOMAIN_NAMES: Record<Domain, string> = {
  maths:    'Maths',
  reading:  'Reading',
  verbal:   'Verbal Reasoning',
  abstract: 'Abstract Reasoning',
  writing:  'Writing',
}

// 5-session weekly rotation covering all 4 exam domains.
// Index 4 is null = pick the two weakest domains at runtime.
export const WEEKLY_ROTATION: (DomainPair | null)[] = [
  ['maths',    'verbal'],
  ['reading',  'abstract'],
  ['maths',    'abstract'],
  ['verbal',   'reading'],
  null,
]

export const LEVELS: LevelInfo[] = [
  { level: 1, title: 'Learner',    xpRequired: 0 },
  { level: 2, title: 'Thinker',    xpRequired: 500 },
  { level: 3, title: 'Challenger', xpRequired: 1500 },
  { level: 4, title: 'Scholar',    xpRequired: 3000 },
  { level: 5, title: 'Achiever',   xpRequired: 5500 },
  { level: 6, title: 'Expert',     xpRequired: 9000 },
  { level: 7, title: 'Elite',      xpRequired: 14000 },
  { level: 8, title: 'Alpha',      xpRequired: 20000 },
]

// Topic definitions matching the DB seed data
export const TOPICS: Topic[] = [
  { id: 'maths_fractions',           domain: 'maths',    name: 'Fractions & Decimals',       year_level: 6, difficulty_base: 6, active: true },
  { id: 'maths_percentages',         domain: 'maths',    name: 'Percentages & Ratios',        year_level: 6, difficulty_base: 6, active: true },
  { id: 'maths_algebra',             domain: 'maths',    name: 'Algebra & Patterns',          year_level: 6, difficulty_base: 7, active: true },
  { id: 'maths_geometry',            domain: 'maths',    name: 'Geometry & Measurement',      year_level: 6, difficulty_base: 5, active: true },
  { id: 'maths_data',                domain: 'maths',    name: 'Data & Probability',          year_level: 6, difficulty_base: 5, active: true },
  { id: 'maths_word_problems',       domain: 'maths',    name: 'Word Problems & Logic',       year_level: 6, difficulty_base: 7, active: true },
  { id: 'maths_number_sense',        domain: 'maths',    name: 'Number Sense & Operations',   year_level: 6, difficulty_base: 5, active: true },
  { id: 'maths_time_money',          domain: 'maths',    name: 'Time, Money & Units',         year_level: 6, difficulty_base: 4, active: true },
  { id: 'reading_inference',         domain: 'reading',  name: 'Inference & Deduction',       year_level: 6, difficulty_base: 7, active: true },
  { id: 'reading_main_idea',         domain: 'reading',  name: 'Main Idea & Summary',         year_level: 6, difficulty_base: 5, active: true },
  { id: 'reading_vocabulary',        domain: 'reading',  name: 'Vocabulary in Context',       year_level: 6, difficulty_base: 6, active: true },
  { id: 'reading_author_intent',     domain: 'reading',  name: 'Author Purpose & Tone',       year_level: 6, difficulty_base: 7, active: true },
  { id: 'reading_text_structure',    domain: 'reading',  name: 'Text Structure & Features',   year_level: 6, difficulty_base: 5, active: true },
  { id: 'verbal_analogies',          domain: 'verbal',   name: 'Word Analogies',              year_level: 6, difficulty_base: 7, active: true },
  { id: 'verbal_antonyms',           domain: 'verbal',   name: 'Antonyms & Synonyms',         year_level: 6, difficulty_base: 5, active: true },
  { id: 'verbal_odd_one_out',        domain: 'verbal',   name: 'Odd One Out',                 year_level: 6, difficulty_base: 5, active: true },
  { id: 'verbal_word_relationships', domain: 'verbal',   name: 'Word Relationships',          year_level: 6, difficulty_base: 6, active: true },
  { id: 'verbal_sentence_completion',domain: 'verbal',   name: 'Sentence Completion',         year_level: 6, difficulty_base: 6, active: true },
  { id: 'abstract_sequences',        domain: 'abstract', name: 'Number & Letter Sequences',   year_level: 6, difficulty_base: 7, active: true },
  { id: 'abstract_pattern_matrix',   domain: 'abstract', name: 'Pattern Matrix',              year_level: 6, difficulty_base: 8, active: true },
  { id: 'abstract_spatial',          domain: 'abstract', name: 'Spatial Reasoning',           year_level: 6, difficulty_base: 7, active: true },
  { id: 'abstract_odd_shape',        domain: 'abstract', name: 'Odd Shape Out',               year_level: 6, difficulty_base: 6, active: true },
  { id: 'writing_planning',          domain: 'writing',  name: 'Planning & Structure',        year_level: 6, difficulty_base: 5, active: true },
  { id: 'writing_persuasive',        domain: 'writing',  name: 'Persuasive Writing',          year_level: 6, difficulty_base: 6, active: true },
  { id: 'writing_narrative',         domain: 'writing',  name: 'Narrative Writing',           year_level: 6, difficulty_base: 5, active: true },
]

// ── Difficulty ──────────────────────────────────────────────────────────────

/**
 * Adaptive difficulty adjustment based on recent performance.
 * Requires at least 3 results to move; never goes below DIFFICULTY_FLOOR.
 */
export function getNextDifficulty(currentDifficulty: number, recentResults: boolean[]): number {
  const last5 = recentResults.slice(-5)
  if (last5.length < 3) return currentDifficulty
  const correctRate = last5.filter(Boolean).length / last5.length

  if (correctRate >= 0.8) return Math.min(DIFFICULTY_CEILING, currentDifficulty + 1)
  if (correctRate <= 0.4) return Math.max(DIFFICULTY_FLOOR, currentDifficulty - 1)
  return currentDifficulty
}

/**
 * Starting difficulty for a topic — never below DIFFICULTY_DEFAULT for this student.
 */
export function getInitialDifficulty(topicDifficultyBase: number): number {
  return Math.max(DIFFICULTY_DEFAULT, topicDifficultyBase)
}

/**
 * Returns the allowed difficulty range for a given prep week (1–8).
 */
export function getWeekDifficultyRange(weekNumber: number): { min: number; max: number } {
  const ranges: Record<number, { min: number; max: number }> = {
    1: { min: 5, max: 6 },
    2: { min: 5, max: 6 },
    3: { min: 5, max: 7 },
    4: { min: 6, max: 7 },
    5: { min: 6, max: 8 },
    6: { min: 7, max: 8 },
    7: { min: 7, max: 9 },
    8: { min: 8, max: 10 },
  }
  return ranges[weekNumber] ?? { min: 6, max: 8 }
}

// ── XP & Levels ─────────────────────────────────────────────────────────────

/**
 * XP earned per question attempt.
 * Incorrect attempts always earn 5 XP (effort rewarded, never zero).
 * Hint use reduces XP by 30%.
 */
export function calculateXP(isCorrect: boolean, difficulty: number, hintUsed: boolean): number {
  if (!isCorrect) return 5
  const base = difficulty * 10
  const hintPenalty = hintUsed ? 0.7 : 1
  return Math.round(base * hintPenalty)
}

/**
 * Returns the LevelInfo for a given total XP value.
 */
export function getLevelForXP(xpTotal: number): LevelInfo {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xpTotal >= LEVELS[i].xpRequired) return LEVELS[i]
  }
  return LEVELS[0]
}

/**
 * Returns level progress details — used to render the XP bar.
 */
export function getXPToNextLevel(xpTotal: number): {
  current: LevelInfo
  next: LevelInfo | null
  xpIntoLevel: number
  xpNeededForNext: number
} {
  const current = getLevelForXP(xpTotal)
  const nextIndex = LEVELS.findIndex(l => l.level === current.level) + 1
  const next = nextIndex < LEVELS.length ? LEVELS[nextIndex] : null
  const xpIntoLevel = xpTotal - current.xpRequired
  const xpNeededForNext = next ? next.xpRequired - current.xpRequired : 0
  return { current, next, xpIntoLevel, xpNeededForNext }
}

// ── Topic Selection ──────────────────────────────────────────────────────────

/**
 * Probabilistic topic selector for a session:
 *  50% — weekly focus topics (primary or secondary)
 *  30% — weakest mastery topic overall
 *  20% — random active topic (breadth maintenance)
 */
export function selectTopicForSession(
  masteryScores: Mastery[],
  weeklyPlan: WeeklyPlan | null
): string {
  const activeTopics = TOPICS.filter(t => t.active)
  const rand = Math.random()

  // 50%: pick from weekly focus topics
  if (rand < 0.5 && weeklyPlan) {
    const focusTopics = [weeklyPlan.primary_topic_id, weeklyPlan.secondary_topic_id].filter(
      (id): id is string => Boolean(id)
    )
    if (focusTopics.length > 0) {
      return focusTopics[Math.floor(Math.random() * focusTopics.length)]
    }
  }

  // 30%: pick lowest mastery topic
  if (rand < 0.8 && masteryScores.length > 0) {
    const sorted = [...masteryScores].sort((a, b) => a.score_alltime - b.score_alltime)
    const weakest = sorted.slice(0, 3)
    return weakest[Math.floor(Math.random() * weakest.length)].topic_id
  }

  // 20%: random topic
  return activeTopics[Math.floor(Math.random() * activeTopics.length)].id
}

export function getTopicById(topicId: string): Topic | undefined {
  return TOPICS.find(t => t.id === topicId)
}

export function getTopicsByDomain(domain: Topic['domain']): Topic[] {
  return TOPICS.filter(t => t.domain === domain)
}

// Returns exam domains sorted by average mastery score ascending (weakest first).
// Ignores 'writing' domain (not in ACER exam).
export function getWeakestDomains(mastery: Mastery[]): Domain[] {
  const examDomains: Domain[] = ['maths', 'reading', 'verbal', 'abstract']
  const avgByDomain = examDomains.map(domain => {
    const topicIds = TOPICS.filter(t => t.domain === domain).map(t => t.id)
    const rows = mastery.filter(m => topicIds.includes(m.topic_id))
    const avg = rows.length > 0
      ? rows.reduce((sum, m) => sum + m.score_alltime, 0) / rows.length
      : 0
    return { domain, avg }
  })
  return avgByDomain.sort((a, b) => a.avg - b.avg).map(d => d.domain)
}

/**
 * Returns the domain pair for a session.
 * Priority:
 *   1. weekly_plan.domain_rotation[sessionIndex] if set
 *   2. Derive from plan primary/secondary topic domains
 *   3. Two weakest mastery domains
 */
export function getSessionDomainPair(
  mastery: Mastery[],
  weeklyPlan: WeeklyPlan | null,
  sessionIndexThisWeek: number,
): DomainPair {
  // 1. Explicit rotation from plan
  if (weeklyPlan?.domain_rotation) {
    const slot = weeklyPlan.domain_rotation[sessionIndexThisWeek % weeklyPlan.domain_rotation.length]
    if (slot) return slot
  }

  // 2. Derive from plan primary/secondary topics
  if (weeklyPlan?.primary_topic_id && weeklyPlan?.secondary_topic_id) {
    const d1 = getTopicById(weeklyPlan.primary_topic_id)?.domain
    const d2 = getTopicById(weeklyPlan.secondary_topic_id)?.domain
    if (d1 && d2 && d1 !== d2) return [d1 as Domain, d2 as Domain]
    if (d1) {
      const weakest = getWeakestDomains(mastery).find(d => d !== d1) ?? 'verbal'
      return [d1 as Domain, weakest]
    }
  }

  // 3. Two weakest domains
  const weakest = getWeakestDomains(mastery)
  return [weakest[0] ?? 'maths', weakest[1] ?? 'verbal']
}

/**
 * Picks a topic ID from the given domain, weighted toward lower mastery.
 * Falls back to a random topic in the domain if mastery data is sparse.
 */
export function selectTopicFromDomain(domain: Domain, mastery: Mastery[]): string {
  const domainTopics = TOPICS.filter(t => t.domain === domain && t.active)
  if (domainTopics.length === 0) return TOPICS[0].id

  // Find the topic with the lowest mastery score (or unattempted)
  const scored = domainTopics.map(t => {
    const m = mastery.find(r => r.topic_id === t.id)
    return { topicId: t.id, score: m?.score_alltime ?? -1 } // -1 = unattempted (prioritise)
  })
  scored.sort((a, b) => a.score - b.score)

  // 60% chance: pick the weakest topic; 40% chance: random from bottom half
  const bottomHalf = scored.slice(0, Math.max(1, Math.ceil(scored.length / 2)))
  if (Math.random() < 0.6) return scored[0].topicId
  return bottomHalf[Math.floor(Math.random() * bottomHalf.length)].topicId
}

// ── Week Number ──────────────────────────────────────────────────────────────

/**
 * Derives the current prep week (1–8) from the exam date.
 * Week 1 = 8 weeks out; Week 8 = final week.
 */
export function getWeekNumber(examDate: Date, today: Date = new Date()): number {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000
  const weeksUntilExam = Math.ceil((examDate.getTime() - today.getTime()) / msPerWeek)
  const weekNumber = 9 - weeksUntilExam
  return Math.max(1, Math.min(8, weekNumber))
}

/**
 * Returns the number of full days remaining until the exam date.
 */
export function getDaysUntilExam(examDate: Date, today: Date = new Date()): number {
  const diff = examDate.getTime() - today.getTime()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}
