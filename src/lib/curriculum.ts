import type { Topic, Mastery, WeeklyPlan, LevelInfo, Domain, DomainPair } from '../types'

// ── Constants ──────────────────────────────────────────────────────────────

export const DIFFICULTY_FLOOR = 5
export const DIFFICULTY_CEILING = 10
export const DIFFICULTY_DEFAULT = 6

export const DOMAIN_NAMES: Record<Domain, string> = {
  maths:     'Mathematics',
  reading:   'Reading Comprehension',
  verbal:    'Verbal Reasoning',
  numerical: 'Numerical Reasoning',
  abstract:  'Abstract Reasoning',
  writing:   'Written Expression',
}

/**
 * The four multiple-choice sections of the EduTest paper Aarav will sit.
 * 'abstract' is deliberately absent — it is not on this exam. 'writing' is a
 * section but is practised through the dedicated writing task, not in a
 * question-per-slot session.
 */
export const EXAM_DOMAINS: Domain[] = ['maths', 'reading', 'verbal', 'numerical']

// 5-session weekly rotation covering all 4 multiple-choice exam sections.
// Index 4 is null = pick the two weakest domains at runtime.
export const WEEKLY_ROTATION: (DomainPair | null)[] = [
  ['maths',   'verbal'],
  ['reading', 'numerical'],
  ['maths',   'numerical'],
  ['verbal',  'reading'],
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

// Topic definitions matching the DB seed data.
//
// Aligned to the EduTest paper (see src/lib/examSpec.ts). Two topics moved
// domain rather than being replaced: 'abstract_sequences' and
// 'abstract_pattern_matrix' were always numerical reasoning wearing an
// "abstract" label, so re-homing them carries Aarav's mastery history across
// instead of orphaning it. The two genuinely off-syllabus abstract topics are
// kept but inactive so historical rows still resolve to a name.
export const TOPICS: Topic[] = [
  // ── Mathematics (30 min) ──────────────────────────────────────────────────
  { id: 'maths_number_sense',        domain: 'maths',     name: 'Number Sense & Operations',        year_level: 6, difficulty_base: 5, active: true },
  { id: 'maths_fractions',           domain: 'maths',     name: 'Fractions & Decimals',             year_level: 6, difficulty_base: 6, active: true },
  { id: 'maths_percentages',         domain: 'maths',     name: 'Percentages & Ratios',             year_level: 6, difficulty_base: 6, active: true },
  { id: 'maths_algebra',             domain: 'maths',     name: 'Patterns & Algebra',               year_level: 6, difficulty_base: 7, active: true },
  { id: 'maths_geometry',            domain: 'maths',     name: 'Measurement & Geometry',           year_level: 6, difficulty_base: 5, active: true },
  { id: 'maths_data',                domain: 'maths',     name: 'Statistics & Probability',         year_level: 6, difficulty_base: 5, active: true },
  { id: 'maths_word_problems',       domain: 'maths',     name: 'Multi-step Word Problems',         year_level: 6, difficulty_base: 7, active: true },
  { id: 'maths_time_money',          domain: 'maths',     name: 'Time, Money & Units',              year_level: 6, difficulty_base: 5, active: true },

  // ── Reading Comprehension (30 min) ────────────────────────────────────────
  { id: 'reading_main_idea',         domain: 'reading',   name: 'Main Idea & Summary',              year_level: 6, difficulty_base: 5, active: true },
  { id: 'reading_inference',         domain: 'reading',   name: 'Inference & Deduction',            year_level: 6, difficulty_base: 7, active: true },
  { id: 'reading_vocabulary',        domain: 'reading',   name: 'Vocabulary in Context',            year_level: 6, difficulty_base: 6, active: true },
  { id: 'reading_author_intent',     domain: 'reading',   name: 'Author Purpose & Tone',            year_level: 6, difficulty_base: 7, active: true },
  { id: 'reading_text_structure',    domain: 'reading',   name: 'Text Structure & Features',        year_level: 6, difficulty_base: 5, active: true },

  // ── Verbal Reasoning (30 min) ─────────────────────────────────────────────
  { id: 'verbal_analogies',          domain: 'verbal',    name: 'Word Analogies',                   year_level: 6, difficulty_base: 7, active: true },
  { id: 'verbal_antonyms',           domain: 'verbal',    name: 'Synonyms & Antonyms',              year_level: 6, difficulty_base: 5, active: true },
  { id: 'verbal_odd_one_out',        domain: 'verbal',    name: 'Odd One Out',                      year_level: 6, difficulty_base: 5, active: true },
  { id: 'verbal_word_relationships', domain: 'verbal',    name: 'Word Relationships',               year_level: 6, difficulty_base: 6, active: true },
  { id: 'verbal_sentence_completion',domain: 'verbal',    name: 'Sentence Completion',              year_level: 6, difficulty_base: 6, active: true },
  { id: 'verbal_logical_deduction',  domain: 'verbal',    name: 'Logical Deduction',                year_level: 6, difficulty_base: 7, active: true },
  { id: 'verbal_codes',              domain: 'verbal',    name: 'Letter & Word Codes',              year_level: 6, difficulty_base: 6, active: true },

  // ── Numerical Reasoning (30 min) ──────────────────────────────────────────
  { id: 'abstract_sequences',        domain: 'numerical', name: 'Number & Letter Sequences',        year_level: 6, difficulty_base: 6, active: true },
  { id: 'abstract_pattern_matrix',   domain: 'numerical', name: 'Number Matrices & Grids',          year_level: 6, difficulty_base: 7, active: true },
  { id: 'numerical_arithmetic',      domain: 'numerical', name: 'Arithmetic Reasoning & Worded Logic', year_level: 6, difficulty_base: 6, active: true },
  { id: 'numerical_properties',      domain: 'numerical', name: 'Number Properties & Relationships',year_level: 6, difficulty_base: 6, active: true },
  { id: 'numerical_proportion',      domain: 'numerical', name: 'Rates, Ratio & Proportion',        year_level: 6, difficulty_base: 7, active: true },

  // ── Written Expression (15 min) ───────────────────────────────────────────
  { id: 'writing_planning',          domain: 'writing',   name: 'Planning & Structure',             year_level: 6, difficulty_base: 5, active: true },
  { id: 'writing_persuasive',        domain: 'writing',   name: 'Persuasive Writing',               year_level: 6, difficulty_base: 6, active: true },
  { id: 'writing_narrative',         domain: 'writing',   name: 'Narrative Writing',                year_level: 6, difficulty_base: 5, active: true },

  // ── Not on the EduTest paper — retained for historical data only ──────────
  { id: 'abstract_spatial',          domain: 'abstract',  name: 'Spatial Reasoning',                year_level: 6, difficulty_base: 7, active: false },
  { id: 'abstract_odd_shape',        domain: 'abstract',  name: 'Odd Shape Out',                    year_level: 6, difficulty_base: 6, active: false },
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
 * Live nudge applied on top of the blueprint's planned difficulty.
 *
 * The session blueprint owns the exam-level mix (see src/lib/weakness.ts and
 * buildDifficultyPlan); this only leans one step either way when the last five
 * answers say Aarav is coasting or struggling. Keeping the nudge to +/-1 stops
 * a good run from dragging a whole session two levels above the real paper.
 */
export function adaptiveDelta(recentResults: boolean[]): -1 | 0 | 1 {
  const last5 = recentResults.slice(-5)
  if (last5.length < 3) return 0
  const rate = last5.filter(Boolean).length / last5.length
  if (rate >= 0.8) return 1
  if (rate <= 0.4) return -1
  return 0
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

/**
 * Topic IDs usable for a domain right now.
 *
 * `validIds` is the set of topic IDs actually present in Supabase (null when the
 * table could not be read). The new EduTest topics are additive, so before
 * db/migrate_edutest_alignment.sql has been run they are filtered out here
 * rather than blowing up the foreign key on attempts.topic_id. Every exam
 * domain still resolves to at least two already-seeded IDs, so a session always
 * builds — before and after the migration.
 */
export function examTopicsForDomain(domain: Domain, validIds: Set<string> | null): string[] {
  const inDomain = TOPICS.filter(t => t.domain === domain && t.active).map(t => t.id)
  const usable = validIds ? inDomain.filter(id => validIds.has(id)) : inDomain
  if (usable.length > 0) return usable

  // Domain wiped out by an unexpected topics table — fall back to maths so the
  // session still runs rather than dying on an empty candidate list.
  const mathsIds = TOPICS.filter(t => t.domain === 'maths' && t.active).map(t => t.id)
  const mathsUsable = validIds ? mathsIds.filter(id => validIds.has(id)) : mathsIds
  return mathsUsable.length > 0 ? mathsUsable : mathsIds
}

// Returns exam domains sorted by average mastery score ascending (weakest first).
// Covers only the four multiple-choice EduTest sections — Written Expression is
// practised through its own timed task.
export function getWeakestDomains(mastery: Mastery[]): Domain[] {
  const avgByDomain = EXAM_DOMAINS.map(domain => {
    const topicIds = TOPICS.filter(t => t.domain === domain).map(t => t.id)
    const rows = mastery.filter(m => topicIds.includes(m.topic_id))
    const avg = rows.length > 0
      ? rows.reduce((sum, m) => sum + m.score_alltime, 0) / rows.length
      : 0
    return { domain, avg }
  })
  return avgByDomain.sort((a, b) => a.avg - b.avg).map(d => d.domain)
}

/** True only for the four multiple-choice sections Aarav will actually sit. */
function isExamDomain(d: Domain | undefined): d is Domain {
  return !!d && EXAM_DOMAINS.includes(d)
}

/**
 * Returns the domain pair for a session.
 * Priority:
 *   1. weekly_plan.domain_rotation[sessionIndex] if set
 *   2. Derive from plan primary/secondary topic domains
 *   3. Two weakest mastery domains
 *
 * Every path is filtered through isExamDomain, so a weekly plan generated
 * before the EduTest realignment (which could name an abstract or writing
 * topic) can never put an off-syllabus block into a session.
 */
export function getSessionDomainPair(
  mastery: Mastery[],
  weeklyPlan: WeeklyPlan | null,
  sessionIndexThisWeek: number,
): DomainPair {
  const weakest = getWeakestDomains(mastery)
  const fallback: DomainPair = [weakest[0] ?? 'maths', weakest[1] ?? 'verbal']

  // 1. Explicit rotation from plan
  if (weeklyPlan?.domain_rotation) {
    const slot = weeklyPlan.domain_rotation[sessionIndexThisWeek % weeklyPlan.domain_rotation.length]
    if (slot && isExamDomain(slot[0]) && isExamDomain(slot[1])) return slot
  }

  // 2. Derive from plan primary/secondary topics
  const d1 = getTopicById(weeklyPlan?.primary_topic_id ?? '')?.domain
  const d2 = getTopicById(weeklyPlan?.secondary_topic_id ?? '')?.domain
  if (isExamDomain(d1) && isExamDomain(d2) && d1 !== d2) return [d1, d2]
  if (isExamDomain(d1)) return [d1, weakest.find(d => d !== d1) ?? 'verbal']

  // 3. Two weakest domains
  return fallback
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
