import type { Mastery, WeeklyPlan } from '../types'
import { getTopicById } from '../lib/curriculum'

interface FocusTodayCardProps {
  mastery: Mastery[]
  weeklyPlan: WeeklyPlan | null
}

const DOMAIN_COLOURS: Record<string, string> = {
  maths:    'bg-blue-500/10 text-blue-400 border-blue-500/20',
  reading:  'bg-purple-500/10 text-purple-400 border-purple-500/20',
  verbal:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
  abstract: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  writing:  'bg-teal-500/10 text-teal-400 border-teal-500/20',
}

function masteryColour(score: number): string {
  if (score >= 0.75) return 'bg-green-500'
  if (score >= 0.5)  return 'bg-amber-500'
  return 'bg-red-500'
}

function masteryLabel(score: number): string {
  return `${Math.round(score * 100)}%`
}

interface FocusTopicRowProps {
  topicId: string
  mastery: Mastery | undefined
  tag?: string
}

function FocusTopicRow({ topicId, mastery, tag }: FocusTopicRowProps) {
  const topic = getTopicById(topicId)
  if (!topic) return null

  const score = mastery?.score_alltime ?? 0
  const domainClass = DOMAIN_COLOURS[topic.domain] ?? 'bg-gray-700/10 text-gray-400 border-gray-600/20'
  const barColour = masteryColour(score)
  const pct = Math.round(score * 100)

  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-white font-medium text-sm truncate">{topic.name}</span>
          {tag && (
            <span className="text-xs text-gray-500 bg-gray-800 rounded px-1.5 py-0.5 shrink-0">{tag}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full ${barColour} rounded-full transition-all duration-500`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className={`text-xs font-semibold shrink-0 ${pct >= 75 ? 'text-green-400' : pct >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
            {mastery ? masteryLabel(score) : '—'}
          </span>
        </div>
      </div>
      <span className={`text-xs font-medium border rounded-full px-2 py-0.5 shrink-0 capitalize ${domainClass}`}>
        {topic.domain}
      </span>
    </div>
  )
}

export function FocusTodayCard({ mastery, weeklyPlan }: FocusTodayCardProps) {
  // Build ordered list of topic IDs to show: plan topics first, then weakest unique
  const focusIds: Array<{ id: string; tag?: string }> = []
  const seen = new Set<string>()

  if (weeklyPlan?.primary_topic_id) {
    focusIds.push({ id: weeklyPlan.primary_topic_id, tag: 'primary focus' })
    seen.add(weeklyPlan.primary_topic_id)
  }
  if (weeklyPlan?.secondary_topic_id) {
    focusIds.push({ id: weeklyPlan.secondary_topic_id, tag: 'secondary focus' })
    seen.add(weeklyPlan.secondary_topic_id)
  }

  // Add single weakest topic not already shown
  const weakest = [...mastery].sort((a, b) => a.score_alltime - b.score_alltime).find(m => !seen.has(m.topic_id))
  if (weakest) {
    focusIds.push({ id: weakest.topic_id, tag: 'needs work' })
  }

  const masteryByTopic = Object.fromEntries(mastery.map(m => [m.topic_id, m]))

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <h2 className="text-white font-bold text-base mb-4">Focus Today</h2>

      {focusIds.length === 0 ? (
        <p className="text-gray-500 text-sm">Complete a session to get personalised topic recommendations.</p>
      ) : (
        <div className="divide-y divide-gray-800">
          {focusIds.map(({ id, tag }) => (
            <FocusTopicRow
              key={id}
              topicId={id}
              mastery={masteryByTopic[id]}
              tag={tag}
            />
          ))}
        </div>
      )}
    </div>
  )
}
