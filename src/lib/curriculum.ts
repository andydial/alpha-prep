import type { Topic, Mastery, WeeklyPlan, LevelInfo } from '../types'

// ── Constants ──────────────────────────────────────────────────────────────

export const DIFFICULTY_FLOOR = 5
export const DIFFICULTY_CEILING = 10
export const DIFFICULTY_DEFAULT = 6

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
