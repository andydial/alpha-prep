export interface Profile {
  id: string
  role: 'student' | 'parent'
  display_name: string | null
  xp_total: number
  level: number
  streak_current: number
  streak_best: number
  last_session_date: string | null
  created_at: string
  formation: string | null
}

export type Domain = 'maths' | 'reading' | 'verbal' | 'abstract' | 'writing'
export type DomainPair = [Domain, Domain]

export interface Topic {
  id: string
  domain: Domain
  name: string
  year_level: number
  difficulty_base: number
  active: boolean
}

export interface Session {
  id: string
  student_id: string
  started_at: string
  completed_at: string | null
  session_type: 'practice' | 'timed_test' | 'drill'
  total_questions: number
  correct_count: number
  duration_seconds: number | null
  week_number: number | null
  notes: string | null
  xp_earned: number
}

export interface Attempt {
  id: string
  session_id: string
  student_id: string
  topic_id: string
  attempted_at: string
  question_text: string
  question_type: 'multiple_choice' | 'short_answer' | 'numeric'
  options: string[] | null
  correct_answer: string
  student_answer: string | null
  is_correct: boolean | null
  difficulty: number
  time_seconds: number | null
  ai_explanation: string | null
  hint_used: boolean
  xp_earned: number
}

export interface Mastery {
  id: string
  student_id: string
  topic_id: string
  last_updated: string
  attempts_total: number
  attempts_correct: number
  score_7day: number
  score_alltime: number
  current_difficulty: number
}

export interface WeeklyPlan {
  id: string
  student_id: string
  week_number: number
  week_start: string
  primary_topic_id: string | null
  secondary_topic_id: string | null
  theme_description: string | null
  daily_goal_questions: number
  ai_rationale: string | null
  created_at: string
  domain_rotation: DomainPair[] | null
}

export interface Question {
  question: string
  type: 'multiple_choice' | 'short_answer' | 'numeric'
  options: string[] | null
  correct_answer: string
  difficulty: number
  topic_id: string
  hint: string
  explanation: string
}

export interface Badge {
  id: string
  name: string
  description: string | null
  icon: string | null
}

export interface StudentBadge {
  id: string
  student_id: string
  badge_id: string
  earned_at: string
  badge?: Badge
}

export interface LevelInfo {
  level: number
  title: string
  xpRequired: number
}

export type CardTier = 'bronze' | 'silver' | 'gold' | 'elite' | 'legend'

export interface PlayerCard {
  id: string
  name: string
  rating: number
  tier: CardTier
  position: string | null
  pace: number | null
  shooting: number | null
  passing: number | null
  dribbling: number | null
  defending: number | null
  physical: number | null
  xp_cost: number
  active: boolean
}

export interface StudentCard {
  id: string
  student_id: string
  card_id: string
  purchased_at: string
  xp_spent: number
  squad_position: string | null
  player_cards?: PlayerCard
}

export type SessionMode = 'planned' | 'quick' | 'domain' | 'topic'

export interface SessionConfig {
  mode: SessionMode
  domainPair: DomainPair
  totalQuestions: number
  forcedTopicId?: string
}
