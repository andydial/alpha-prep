import { supabase } from './supabase'
import { TOPICS, getWeekNumber } from './curriculum'
import type { Mastery, WeeklyPlan } from '../types'

const EXAM_DATE = new Date('2026-08-14')

interface PlanPayload {
  primaryTopicId: string
  secondaryTopicId: string
  themeDescription: string
  dailyGoal: number
  rationale: string
}

async function callAnthropicForPlan(
  weekNumber: number,
  masteryScores: { topicId: string; topicName: string; score: number }[]
): Promise<PlanPayload> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('Missing Anthropic API key')

  const prompt = `You are planning Week ${weekNumber} of 8 for a high-achieving Year 6 student preparing for the EDSC Alpha selective entry exam.

Current mastery scores (0-100%):
${masteryScores.map(m => `- ${m.topicName} (id: ${m.topicId}): ${Math.round(m.score * 100)}%`).join('\n')}

Choose 2 focus topics for this week. Prioritise:
1. Topics with lowest mastery scores (they need the most work)
2. Topics that are heavily tested in ACER-style selective entry exams (maths reasoning, verbal reasoning, abstract reasoning)
3. Variety — try to pick topics from different domains where possible

Respond with JSON only — no markdown, no preamble:
{
  "primaryTopicId": "exact topic id from the list above",
  "secondaryTopicId": "different exact topic id from the list above",
  "themeDescription": "one sentence — e.g. Fractions mastery + Verbal analogies",
  "dailyGoal": 15,
  "rationale": "2-3 sentences explaining why these topics this week based on the mastery data"
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
      model: 'claude-sonnet-4-20250514',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    throw new Error(`Anthropic API error ${response.status}: ${errText}`)
  }

  const data = await response.json() as { content: { type: string; text: string }[] }
  const text = data.content.find(c => c.type === 'text')?.text ?? '{}'
  // Strip markdown fences if present
  const cleaned = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
  return JSON.parse(cleaned) as PlanPayload
}

export async function generateWeeklyPlan(
  studentId: string,
  masteryRows: Mastery[]
): Promise<WeeklyPlan | null> {
  const weekNumber = getWeekNumber(EXAM_DATE)

  // Monday of current week
  const today = new Date()
  const monday = new Date(today)
  const dayOfWeek = today.getDay() // 0 = Sunday
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  monday.setDate(today.getDate() + daysToMonday)
  const weekStart = monday.toISOString().split('T')[0]

  const masteryScores = TOPICS.map(t => {
    const m = masteryRows.find(r => r.topic_id === t.id)
    return { topicId: t.id, topicName: t.name, score: m?.score_alltime ?? 0 }
  })

  try {
    const plan = await callAnthropicForPlan(weekNumber, masteryScores)

    const { data, error } = await supabase
      .from('weekly_plans')
      .insert({
        student_id: studentId,
        week_number: weekNumber,
        week_start: weekStart,
        primary_topic_id: plan.primaryTopicId,
        secondary_topic_id: plan.secondaryTopicId,
        theme_description: plan.themeDescription,
        daily_goal_questions: plan.dailyGoal,
        ai_rationale: plan.rationale,
      })
      .select()
      .single()

    if (error) throw error
    return data as WeeklyPlan
  } catch (err) {
    console.error('Failed to generate weekly plan:', err)
    return null
  }
}
