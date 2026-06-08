import type { WeeklyPlan } from '../types'
import { getTopicById } from '../lib/curriculum'

interface WeeklyThemeCardProps {
  plan: WeeklyPlan | null
  weekNumber: number
}

export function WeeklyThemeCard({ plan, weekNumber }: WeeklyThemeCardProps) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-white font-bold text-base">Week {weekNumber} Focus</h2>
        {plan && (
          <span className="text-xs text-gray-500 bg-gray-800 rounded-full px-2.5 py-1">
            {new Date(plan.week_start).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
          </span>
        )}
      </div>

      {!plan ? (
        <p className="text-gray-500 text-sm">
          No weekly plan yet — start a session to generate one.
        </p>
      ) : (
        <>
          {plan.theme_description && (
            <p className="text-white font-semibold text-sm mb-3">{plan.theme_description}</p>
          )}

          <div className="flex flex-wrap gap-2 mb-3">
            {plan.primary_topic_id && (
              <TopicChip topicId={plan.primary_topic_id} label="Primary" />
            )}
            {plan.secondary_topic_id && (
              <TopicChip topicId={plan.secondary_topic_id} label="Secondary" />
            )}
          </div>

          {plan.ai_rationale && (
            <p className="text-gray-400 text-xs leading-relaxed border-t border-gray-800 pt-3">
              {plan.ai_rationale}
            </p>
          )}

          <p className="text-gray-500 text-xs mt-3">
            Daily goal: <span className="text-gray-300 font-semibold">{plan.daily_goal_questions} questions</span>
          </p>
        </>
      )}
    </div>
  )
}

function TopicChip({ topicId, label }: { topicId: string; label: string }) {
  const topic = getTopicById(topicId)
  if (!topic) return null
  return (
    <span className="inline-flex items-center gap-1.5 bg-gray-800 text-gray-300 text-xs rounded-full px-3 py-1">
      <span className="text-gray-500">{label}:</span>
      {topic.name}
    </span>
  )
}
