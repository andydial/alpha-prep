import { supabase } from './supabase'
import { TOPICS, EXAM_DOMAINS, getWeekNumber } from './curriculum'
import { parseExamDate } from './examDate'
import type { Mastery, WeeklyPlan } from '../types'

interface PlanPayload {
  primaryTopicId: string
  secondaryTopicId: string
  themeDescription: string
  dailyGoal: number
  rationale: string
  domainRotation: [string, string][]
}

// Only topics on the EduTest paper may be planned. Retired abstract topics and
// the writing topics (practised through the timed writing task) are excluded.
const PLANNABLE_TOPICS = TOPICS.filter(t => t.active && EXAM_DOMAINS.includes(t.domain))
const VALID_TOPIC_IDS = new Set(PLANNABLE_TOPICS.map(t => t.id))

function pickFallbackTopics(
  masteryScores: { topicId: string; score: number }[]
): { primaryTopicId: string; secondaryTopicId: string } {
  const sorted = [...masteryScores].sort((a, b) => a.score - b.score)
  const primary = sorted[0]
  const primaryDomain = TOPICS.find(t => t.id === primary.topicId)?.domain
  const secondary =
    sorted.find(m => TOPICS.find(t => t.id === m.topicId)?.domain !== primaryDomain) ??
    sorted[1]
  return { primaryTopicId: primary.topicId, secondaryTopicId: secondary.topicId }
}

async function callAnthropicForPlan(
  weekNumber: number,
  masteryScores: { topicId: string; topicName: string; score: number }[]
): Promise<PlanPayload> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('Missing Anthropic API key')

  const prompt = `You are planning Week ${weekNumber} of 8 for Aarav's EDSC Alpha exam preparation.

Current mastery scores (0-100%):
${masteryScores.map(m => `- ${m.topicId} (${m.topicName}): ${Math.round(m.score * 100)}%`).join('\n')}

The exam is an EduTest paper with four multiple-choice sections: Mathematics, Reading Comprehension, Verbal Reasoning and Numerical Reasoning. There is NO abstract or non-verbal reasoning section — never name one.

Choose 2 focus topics for this week AND provide a 5-session domain rotation that guarantees all 4 exam sections are touched across the week.

Exam domain guidance:
- Domains must be exactly one of: maths, reading, verbal, numerical
- Pairs should mix strengths with weaknesses for each session
- Use this baseline rotation unless mastery data suggests otherwise:
  Session 1: maths + verbal
  Session 2: reading + numerical
  Session 3: maths + numerical
  Session 4: verbal + reading
  Session 5: the two lowest-scoring domains

Respond with JSON only — no markdown, no preamble:
{
  "primaryTopicId": "must be exactly one of the topic IDs listed above (e.g. maths_fractions)",
  "secondaryTopicId": "must be exactly one of the topic IDs listed above, different from primaryTopicId",
  "themeDescription": "one sentence — e.g. Fractions mastery + Verbal analogies",
  "dailyGoal": 15,
  "rationale": "2-3 sentences explaining why these topics and this rotation this week based on the mastery data",
  "domainRotation": [
    ["maths", "verbal"],
    ["reading", "numerical"],
    ["maths", "numerical"],
    ["verbal", "reading"],
    ["<weakest_domain>", "<second_weakest_domain>"]
  ]
}`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    throw new Error(`Anthropic API error ${response.status}: ${errText}`)
  }

  const data = await response.json() as { content: { type: string; text: string }[] }
  const text = data.content.find(c => c.type === 'text')?.text ?? '{}'
  const cleaned = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
  const parsed = JSON.parse(cleaned) as PlanPayload

  // Validate both IDs against the known topic list before they reach the FK constraint
  const primaryValid = VALID_TOPIC_IDS.has(parsed.primaryTopicId)
  const secondaryValid = VALID_TOPIC_IDS.has(parsed.secondaryTopicId)
  if (!primaryValid || !secondaryValid) {
    if (!primaryValid) console.error('[weeklyPlan] AI returned invalid primaryTopicId:', parsed.primaryTopicId)
    if (!secondaryValid) console.error('[weeklyPlan] AI returned invalid secondaryTopicId:', parsed.secondaryTopicId)
    const fallback = pickFallbackTopics(masteryScores)
    if (!primaryValid) parsed.primaryTopicId = fallback.primaryTopicId
    if (!secondaryValid) parsed.secondaryTopicId = fallback.secondaryTopicId
  }

  // A rotation naming a section that is not on the paper (abstract, writing)
  // would put an off-syllabus block into a real session. Drop it and let
  // getSessionDomainPair fall back to the weakest exam domains.
  const rotationValid = Array.isArray(parsed.domainRotation) &&
    parsed.domainRotation.every(pair =>
      Array.isArray(pair) && pair.length === 2 &&
      pair.every(d => (EXAM_DOMAINS as string[]).includes(d)))
  if (!rotationValid) {
    console.error('[weeklyPlan] AI returned an off-syllabus domain rotation:', parsed.domainRotation)
    parsed.domainRotation = [
      ['maths', 'verbal'], ['reading', 'numerical'], ['maths', 'numerical'],
      ['verbal', 'reading'], ['maths', 'reading'],
    ]
  }

  return parsed
}

export async function generateWeeklyPlan(
  studentId: string,
  masteryRows: Mastery[],
  /** From settings.exam_date — never hardcode this. */
  examDateValue?: string | null,
): Promise<WeeklyPlan | null> {
  const weekNumber = getWeekNumber(parseExamDate(examDateValue))

  const today = new Date()
  const monday = new Date(today)
  const dayOfWeek = today.getDay()
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  monday.setDate(today.getDate() + daysToMonday)
  const weekStart = monday.toISOString().split('T')[0]

  const masteryScores = PLANNABLE_TOPICS.map(t => {
    const m = masteryRows.find(r => r.topic_id === t.id)
    return { topicId: t.id, topicName: t.name, score: m?.score_alltime ?? 0 }
  })

  try {
    const plan = await callAnthropicForPlan(weekNumber, masteryScores)

    const baseRow = {
      student_id: studentId,
      week_number: weekNumber,
      week_start: weekStart,
      primary_topic_id: plan.primaryTopicId,
      secondary_topic_id: plan.secondaryTopicId,
      theme_description: plan.themeDescription,
      daily_goal_questions: plan.dailyGoal,
      ai_rationale: plan.rationale,
    }

    let { data, error } = await supabase
      .from('weekly_plans')
      .insert({ ...baseRow, domain_rotation: plan.domainRotation })
      .select()
      .single()

    if (error?.code === '42703') {
      ;({ data, error } = await supabase
        .from('weekly_plans')
        .insert(baseRow)
        .select()
        .single())
    }

    if (error) throw error
    return data as WeeklyPlan
  } catch (err) {
    console.error('Failed to generate weekly plan:', err)
    return null
  }
}
