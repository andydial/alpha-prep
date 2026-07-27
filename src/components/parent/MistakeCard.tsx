import { getTopicById } from '../../lib/curriculum'
import type { Attempt } from '../../types'

interface MistakeCardProps {
  attempt: Attempt
  /** 1-based position within the session, so it can be found on screen with Aarav. */
  index: number
}

/**
 * One question Aarav got wrong: the question, his answer, the correct answer.
 *
 * Multiple-choice answers are stored as the full option string (e.g. "C) 2 5/8 cups"),
 * so the two answers read correctly without listing every option.
 */
export function MistakeCard({ attempt, index }: MistakeCardProps) {
  const topicName = getTopicById(attempt.topic_id)?.name ?? attempt.topic_id

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden print:border-gray-300 print:bg-white print:break-inside-avoid">
      {/* Topic + position */}
      <div className="flex items-center justify-between gap-3 px-5 py-2.5 border-b border-gray-800 print:border-gray-200">
        <span className="text-xs font-semibold text-blue-300 uppercase tracking-wide truncate print:text-gray-600">
          {topicName}
        </span>
        <span className="text-xs text-gray-600 shrink-0 print:text-gray-400">Q{index}</span>
      </div>

      {/* Question */}
      <p className="px-5 py-4 text-sm text-gray-100 leading-relaxed whitespace-pre-wrap print:text-gray-900">
        {attempt.question_text}
      </p>

      {/* Answers */}
      <div className="px-5 pb-4 space-y-2">
        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/25 rounded-xl px-3.5 py-2.5 print:bg-white print:border-gray-300">
          <span className="text-red-400 text-sm leading-5 shrink-0 print:text-gray-700">✗</span>
          <span className="min-w-0">
            <span className="block text-[0.7rem] font-semibold text-red-400/80 uppercase tracking-wide print:text-gray-500">
              Aarav answered
            </span>
            <span className="block text-sm text-red-200 mt-0.5 break-words print:text-gray-900">
              {attempt.student_answer?.trim() || 'No answer given'}
            </span>
          </span>
        </div>

        <div className="flex items-start gap-3 bg-green-500/10 border border-green-500/25 rounded-xl px-3.5 py-2.5 print:bg-white print:border-gray-300">
          <span className="text-green-400 text-sm leading-5 shrink-0 print:text-gray-700">✓</span>
          <span className="min-w-0">
            <span className="block text-[0.7rem] font-semibold text-green-400/80 uppercase tracking-wide print:text-gray-500">
              Correct answer
            </span>
            <span className="block text-sm text-green-200 mt-0.5 break-words print:text-gray-900">
              {attempt.correct_answer}
            </span>
          </span>
        </div>
      </div>
    </div>
  )
}
