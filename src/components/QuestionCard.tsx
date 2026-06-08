import type { Question } from '../types'
import { getTopicById } from '../lib/curriculum'

interface QuestionCardProps {
  question: Question
  questionNumber: number
  totalQuestions: number
}

const DOMAIN_COLOURS: Record<string, string> = {
  maths:    'text-blue-400 bg-blue-500/10 border-blue-500/30',
  reading:  'text-purple-400 bg-purple-500/10 border-purple-500/30',
  verbal:   'text-amber-400 bg-amber-500/10 border-amber-500/30',
  abstract: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  writing:  'text-green-400 bg-green-500/10 border-green-500/30',
}

function difficultyColour(d: number): string {
  if (d >= 8) return 'text-red-400 bg-red-500/10 border-red-500/30'
  if (d >= 6) return 'text-amber-400 bg-amber-500/10 border-amber-500/30'
  return 'text-green-400 bg-green-500/10 border-green-500/30'
}

export function QuestionCard({ question, questionNumber, totalQuestions }: QuestionCardProps) {
  const topic = getTopicById(question.topic_id)
  const domain = topic?.domain ?? 'maths'
  const topicColour = DOMAIN_COLOURS[domain] ?? DOMAIN_COLOURS.maths
  const diffColour = difficultyColour(question.difficulty)
  const progress = (questionNumber - 1) / totalQuestions

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-gray-400 font-medium">
          Question {questionNumber} of {totalQuestions}
        </span>
        <div className="flex items-center gap-2">
          {topic && (
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${topicColour}`}>
              {topic.name}
            </span>
          )}
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${diffColour}`}>
            Level {question.difficulty}
          </span>
        </div>
      </div>

      {/* Progress bar — CSS variable required for dynamic width */}
      <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-600 rounded-full transition-all duration-500"
          style={{ width: `${Math.round(progress * 100)}%` } as React.CSSProperties}
        />
      </div>

      {/* Question text */}
      <p className="text-white text-lg font-medium leading-relaxed">
        {question.question}
      </p>
    </div>
  )
}
