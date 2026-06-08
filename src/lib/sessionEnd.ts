import { supabase } from './supabase'
import { getLevelForXP } from './curriculum'

interface SessionEndParams {
  studentId: string
  sessionId: string
  attempts: {
    topicId: string
    isCorrect: boolean
    difficulty: number
    timeTaken: number
  }[]
  xpEarned: number
  currentXPTotal: number
  currentStreak: number
  lastSessionDate: string | null
}

export async function runSessionEnd(params: SessionEndParams): Promise<{
  newXPTotal: number
  newLevel: number
  leveledUp: boolean
  newStreak: number
  badgesEarned: string[]
}> {
  const {
    studentId, sessionId, attempts, xpEarned,
    currentXPTotal, currentStreak, lastSessionDate,
  } = params

  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  // ── 1. Update mastery per topic ──────────────────────────────────────────
  const byTopic = new Map<string, { correct: number; total: number }>()
  for (const a of attempts) {
    const existing = byTopic.get(a.topicId) ?? { correct: 0, total: 0 }
    byTopic.set(a.topicId, {
      correct: existing.correct + (a.isCorrect ? 1 : 0),
      total: existing.total + 1,
    })
  }

  for (const [topicId, counts] of byTopic) {
    const { data: existing } = await supabase
      .from('mastery')
      .select('*')
      .eq('student_id', studentId)
      .eq('topic_id', topicId)
      .single()

    const prevTotal = existing?.attempts_total ?? 0
    const prevCorrect = existing?.attempts_correct ?? 0
    const newTotal = prevTotal + counts.total
    const newCorrect = prevCorrect + counts.correct
    const scoreAlltime = newTotal > 0 ? newCorrect / newTotal : 0

    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()
    const { data: recentAttempts } = await supabase
      .from('attempts')
      .select('is_correct')
      .eq('student_id', studentId)
      .eq('topic_id', topicId)
      .gte('attempted_at', sevenDaysAgo)

    const recent = recentAttempts ?? []
    const score7day = recent.length > 0
      ? recent.filter(a => a.is_correct).length / recent.length
      : scoreAlltime

    const { error: upsertError } = await supabase.from('mastery').upsert({
      student_id: studentId,
      topic_id: topicId,
      attempts_total: newTotal,
      attempts_correct: newCorrect,
      score_alltime: scoreAlltime,
      score_7day: score7day,
      last_updated: new Date().toISOString(),
    }, { onConflict: 'student_id,topic_id' })
    if (upsertError) console.error('[runSessionEnd] mastery upsert failed:', topicId, upsertError)
  }

  // ── 2. Update XP + Level ─────────────────────────────────────────────────
  const newXPTotal = currentXPTotal + xpEarned
  const oldLevel = getLevelForXP(currentXPTotal)
  const newLevelInfo = getLevelForXP(newXPTotal)
  const leveledUp = newLevelInfo.level > oldLevel.level

  // ── 3. Update streak ─────────────────────────────────────────────────────
  let newStreak: number
  if (lastSessionDate === today) {
    newStreak = currentStreak
  } else if (lastSessionDate === yesterday) {
    newStreak = currentStreak + 1
  } else {
    newStreak = 1
  }

  // ── 4. Update profile ────────────────────────────────────────────────────
  const { data: profileData } = await supabase
    .from('profiles')
    .select('streak_best')
    .eq('id', studentId)
    .single()

  const currentBest = profileData?.streak_best ?? 0
  const { error: profileUpdateError } = await supabase.from('profiles').update({
    xp_total: newXPTotal,
    level: newLevelInfo.level,
    streak_current: newStreak,
    streak_best: Math.max(currentBest, newStreak),
    last_session_date: today,
  }).eq('id', studentId)
  if (profileUpdateError) console.error('[runSessionEnd] profile update failed:', profileUpdateError)

  // ── 5. Check and award badges ─────────────────────────────────────────────
  const badgesEarned: string[] = []

  const { data: existingBadges } = await supabase
    .from('student_badges')
    .select('badge_id')
    .eq('student_id', studentId)
  const alreadyEarned = new Set((existingBadges ?? []).map(b => b.badge_id))

  async function maybeAward(badgeId: string) {
    if (alreadyEarned.has(badgeId)) return
    const { error: badgeError } = await supabase.from('student_badges').insert({ student_id: studentId, badge_id: badgeId })
    if (badgeError) { console.error('[runSessionEnd] badge insert failed:', badgeId, badgeError); return }
    alreadyEarned.add(badgeId)
    badgesEarned.push(badgeId)
  }

  const { count: totalAttempts } = await supabase
    .from('attempts')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', studentId)

  if ((totalAttempts ?? 0) >= 1) await maybeAward('first_session')
  if ((totalAttempts ?? 0) >= 100) await maybeAward('century')
  if ((totalAttempts ?? 0) >= 500) await maybeAward('five_hundred')

  if (newStreak >= 3) await maybeAward('streak_3')
  if (newStreak >= 7) await maybeAward('streak_7')
  if (newStreak >= 14) await maybeAward('streak_14')
  if (newStreak >= 21) await maybeAward('streak_21')

  if (newLevelInfo.level >= 8) await maybeAward('level_alpha')

  const sessionAttempts = attempts.length
  const sessionCorrect = attempts.filter(a => a.isCorrect).length
  if (sessionAttempts >= 10 && sessionCorrect === sessionAttempts) {
    await maybeAward('perfect_session')
  }

  const correctDifficulties = attempts.filter(a => a.isCorrect).map(a => a.difficulty)
  const maxDifficulty = correctDifficulties.length > 0 ? Math.max(...correctDifficulties) : 0
  if (maxDifficulty >= 9) await maybeAward('difficulty_9')
  if (maxDifficulty >= 10) await maybeAward('difficulty_10')

  const fastCorrect = attempts.filter(a => a.isCorrect && a.timeTaken <= 30).length
  if (fastCorrect >= 10) await maybeAward('speed_demon')

  const { data: masteryRows } = await supabase
    .from('mastery')
    .select('topic_id, score_alltime')
    .eq('student_id', studentId)

  const topics85 = (masteryRows ?? []).filter(m => m.score_alltime >= 0.85).map(m => m.topic_id)
  const mathsTopics    = ['maths_fractions','maths_percentages','maths_algebra','maths_geometry','maths_data','maths_word_problems','maths_number_sense','maths_time_money']
  const readingTopics  = ['reading_inference','reading_main_idea','reading_vocabulary','reading_author_intent','reading_text_structure']
  const verbalTopics   = ['verbal_analogies','verbal_antonyms','verbal_odd_one_out','verbal_word_relationships','verbal_sentence_completion']
  const abstractTopics = ['abstract_sequences','abstract_pattern_matrix','abstract_spatial','abstract_odd_shape']

  if (topics85.some(t => mathsTopics.includes(t)))    await maybeAward('maths_master')
  if (topics85.some(t => readingTopics.includes(t)))  await maybeAward('reading_ace')
  if (topics85.some(t => verbalTopics.includes(t)))   await maybeAward('verbal_pro')
  if (topics85.some(t => abstractTopics.includes(t))) await maybeAward('abstract_genius')

  const { error: notesError } = await supabase
    .from('sessions')
    .update({ notes: `XP: +${xpEarned} | Level: ${newLevelInfo.level} | Streak: ${newStreak}` })
    .eq('id', sessionId)
  if (notesError) console.error('[runSessionEnd] session notes update failed:', notesError)

  return { newXPTotal, newLevel: newLevelInfo.level, leveledUp, newStreak, badgesEarned }
}
