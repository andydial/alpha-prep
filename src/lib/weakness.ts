import type { Mastery } from '../types'
import { buildDifficultyPlan, type DifficultyBand } from './examSpec'

/**
 * Which topics Aarav is weakest on, and how a session should be shaped around
 * that.
 *
 * Topics used to be drawn per question by a probabilistic selector, so what he
 * actually got was luck: a weak topic could be skipped entirely, or crowd out
 * the rest of the block. Here the whole session is planned up front as an
 * ordered list of slots, which makes three things guarantees rather than
 * tendencies — every block covers several topics, the weakest topic gets a
 * bounded number of extra questions, and the 5-10% stretch share lands where
 * it was meant to.
 */

/** A recent attempt row, reduced to what weakness ranking needs. */
export interface AttemptSignal {
  topic_id: string
  is_correct: boolean | null
}

export interface WeaknessRank {
  topicId: string
  /** 0 = mastered, 1 = never right. */
  weakness: number
  /** How many attempts back the score — low evidence pulls the score to neutral. */
  evidence: number
}

/** Attempts needed before a topic's score is taken at full weight. */
const FULL_CONFIDENCE_AT = 8

/** Where a topic with no history sits: mid-pack, so it is neither drilled nor ignored. */
const NEUTRAL_WEAKNESS = 0.5

/**
 * Ranks topics weakest-first.
 *
 * Recent performance is weighted more heavily than the all-time score (0.6 vs
 * 0.4) so a topic he has just started dropping rises immediately instead of
 * waiting for the long-run average to catch up. Topics with little or no
 * history are pulled toward neutral rather than treated as 0% — an unattempted
 * topic is unknown, not weak.
 */
export function rankWeakness(
  topicIds: string[],
  mastery: Mastery[],
  recent: AttemptSignal[],
): WeaknessRank[] {
  return topicIds
    .map(topicId => {
      const row = mastery.find(m => m.topic_id === topicId)
      const evidence = row?.attempts_total ?? 0
      const accuracy = row?.score_alltime ?? 0

      const recentRows = recent.filter(a => a.topic_id === topicId)
      const recentAccuracy = recentRows.length > 0
        ? recentRows.filter(a => a.is_correct).length / recentRows.length
        : accuracy

      const confidence = Math.min(1, evidence / FULL_CONFIDENCE_AT)
      const scored = 0.4 * (1 - accuracy) + 0.6 * (1 - recentAccuracy)
      const weakness = confidence * scored + (1 - confidence) * NEUTRAL_WEAKNESS

      return { topicId, weakness, evidence }
    })
    .sort((a, b) => b.weakness - a.weakness)
}

export interface Slot {
  topicId: string
  difficulty: number
  stretch: boolean
}

export interface BlueprintParams {
  topicIds: string[]
  count: number
  band: DifficultyBand
  mastery: Mastery[]
  recent: AttemptSignal[]
  rng?: () => number
}

/**
 * Extra questions granted to the weakest topic and the runner-up.
 *
 * Deliberately small. The brief is "a few more questions on the weak topic",
 * not "turn the session into a drill" — a block that stops covering the section
 * stops preparing him for the section.
 */
function bonusFor(count: number): [number, number] {
  if (count >= 30) return [3, 2]
  if (count >= 20) return [2, 1]
  if (count >= 12) return [2, 0]
  return [1, 0]
}

/** No single topic may take more than this share of a block. */
const MAX_TOPIC_SHARE = 0.4

function shuffle<T>(items: T[], rng: () => number): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * Plans one block of a session: which topic each question comes from, at what
 * difficulty, and which questions are the stretch ones.
 *
 * Shape of the result:
 *   - an even spread across the block's topics as the base,
 *   - plus 1-3 extra questions on the weakest topic (and 0-2 on the next),
 *     taken from the strongest topics rather than added on top,
 *   - capped so no topic exceeds 40% of the block and at least three distinct
 *     topics appear (or every topic, if the block has fewer than three),
 *   - ordered round-robin so the drilled topic is spread through the block
 *     instead of arriving as a lump.
 */
export function buildBlueprint(params: BlueprintParams): Slot[] {
  const { topicIds, count, band, mastery, recent } = params
  const rng = params.rng ?? Math.random
  if (count <= 0) return []
  if (topicIds.length === 0) return []

  const ranked = rankWeakness(topicIds, mastery, recent)
  const counts = new Map<string, number>(topicIds.map(id => [id, 0]))

  // 1. Even base spread. Remainder goes to the weakest topics first.
  const base = Math.floor(count / topicIds.length)
  for (const id of topicIds) counts.set(id, base)
  let remainder = count - base * topicIds.length
  for (const rank of ranked) {
    if (remainder <= 0) break
    counts.set(rank.topicId, (counts.get(rank.topicId) ?? 0) + 1)
    remainder--
  }

  // 2. Weakness bonus, moved off the strongest topics so the block stays the
  //    same length. A topic is never emptied to pay for a bonus.
  const [bonusFirst, bonusSecond] = bonusFor(count)
  const donors = [...ranked].reverse() // strongest first
  const takeFrom = (needed: number): number => {
    let taken = 0
    for (const donor of donors) {
      while (taken < needed && (counts.get(donor.topicId) ?? 0) > 1) {
        counts.set(donor.topicId, (counts.get(donor.topicId) ?? 0) - 1)
        taken++
      }
      if (taken >= needed) break
    }
    return taken
  }

  const cap = Math.max(1, Math.floor(count * MAX_TOPIC_SHARE))
  const applyBonus = (topicId: string | undefined, wanted: number) => {
    if (!topicId || wanted <= 0) return
    const current = counts.get(topicId) ?? 0
    const room = Math.max(0, cap - current)
    const moved = takeFrom(Math.min(wanted, room))
    counts.set(topicId, current + moved)
  }

  applyBonus(ranked[0]?.topicId, bonusFirst)
  applyBonus(ranked[1]?.topicId, bonusSecond)

  // 3. Guarantee breadth: at least three distinct topics wherever the block has
  //    them, taken back off whichever topic is currently largest.
  const minDistinct = Math.min(3, topicIds.length)
  const distinct = () => [...counts.values()].filter(n => n > 0).length
  while (distinct() < minDistinct) {
    const empty = topicIds.find(id => (counts.get(id) ?? 0) === 0)
    const largest = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
    if (!empty || !largest || largest[1] <= 1) break
    counts.set(largest[0], largest[1] - 1)
    counts.set(empty, 1)
  }

  // 4. Round-robin the slots so a drilled topic is spread through the block.
  const queues = shuffle(
    [...counts.entries()].filter(([, n]) => n > 0),
    rng,
  ).map(([topicId, n]) => ({ topicId, left: n }))

  const order: string[] = []
  while (order.length < count) {
    let placed = false
    for (const q of queues) {
      if (q.left <= 0) continue
      order.push(q.topicId)
      q.left--
      placed = true
      if (order.length >= count) break
    }
    if (!placed) break
  }
  // Pad defensively — reaching here means the counts did not sum to `count`.
  while (order.length < count) order.push(ranked[0]?.topicId ?? topicIds[0])

  const difficulties = buildDifficultyPlan(count, band, rng)
  return order.map((topicId, i) => ({
    topicId,
    difficulty: difficulties[i].difficulty,
    stretch: difficulties[i].stretch,
  }))
}
