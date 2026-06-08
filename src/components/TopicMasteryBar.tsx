import { getTopicById } from '../lib/curriculum'

interface TopicMasteryBarProps {
  topicId: string
  score: number    // 0-1 float
  attempts: number
}

export function TopicMasteryBar({ topicId, score, attempts }: TopicMasteryBarProps) {
  const topic = getTopicById(topicId)
  const pct = Math.round(score * 100)

  const barColour =
    score < 0.5 ? 'bg-red-500' :
    score < 0.75 ? 'bg-amber-500' :
    'bg-green-500'

  const labelColour =
    score < 0.5 ? 'text-red-400' :
    score < 0.75 ? 'text-amber-400' :
    'text-green-400'

  return (
    <div className="flex flex-col gap-1 py-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-200">
          {topic?.name ?? topicId}
        </span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">{attempts} attempts</span>
          <span className={`text-sm font-semibold w-10 text-right ${labelColour}`}>
            {pct}%
          </span>
        </div>
      </div>
      <div className="h-2 rounded-full bg-gray-800">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${barColour}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
