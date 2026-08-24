import { useState } from 'react'
import { CheckCircle, XCircle, ArrowRight, AlertTriangle } from 'lucide-react'

interface ExplanationPanelProps {
  isCorrect: boolean
  correctAnswer: string
  explanation: string
  hintUsed: boolean
  xpEarned: number
  /** False when the independent marker could not be reached, so `correctAnswer`
   *  is the generated key and has not been checked by anything. */
  answerVerified?: boolean
  /** True when the verified answer was not one of the four options offered —
   *  the question itself was faulty and no choice could have been right. */
  optionsFaulty?: boolean
  onNext: () => void
  onFlag?: () => void
}

export function ExplanationPanel({
  isCorrect,
  correctAnswer,
  explanation,
  hintUsed,
  xpEarned,
  answerVerified = true,
  optionsFaulty = false,
  onNext,
  onFlag,
}: ExplanationPanelProps) {
  const [flagged, setFlagged] = useState(false)
  const ENCOURAGEMENTS = ['Nice work!', 'Correct!', 'Nailed it!', 'Well done!', 'Spot on!']
  const encouragement = ENCOURAGEMENTS[Math.floor(Date.now() / 1000) % ENCOURAGEMENTS.length]

  return (
    <div
      className={`border rounded-2xl p-6 space-y-4 animate-pop-in ${
        isCorrect
          ? 'bg-green-500/10 border-green-500/30'
          : 'bg-amber-500/10 border-amber-500/30 animate-shake'
      }`}
    >
      {/* Result header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isCorrect ? (
            <CheckCircle size={22} className="text-green-400" />
          ) : (
            <XCircle size={22} className="text-amber-400" />
          )}
          <span
            className={`text-base font-semibold ${
              isCorrect ? 'text-green-400' : 'text-amber-400'
            }`}
          >
            {isCorrect ? encouragement : 'Not quite'}
          </span>
        </div>

        {/* XP earned */}
        <div
          className={`text-sm font-bold px-3 py-1 rounded-full ${
            isCorrect
              ? 'text-green-300 bg-green-500/20'
              : 'text-gray-400 bg-gray-700/50'
          }`}
        >
          +{xpEarned} XP{hintUsed && isCorrect ? ' (hint used)' : ''}
        </div>
      </div>

      {/* Correct answer (shown if wrong) */}
      {!isCorrect && (
        <div className="text-sm text-gray-300">
          <span className="text-gray-400">Correct answer: </span>
          <span className="font-semibold text-white">{correctAnswer}</span>
        </div>
      )}

      {/* The answer shown above could not be checked, or the question was
          faulty. Say so plainly rather than presenting it as settled — being
          marked wrong against an unchecked key is what this warning exists to
          prevent. */}
      {!isCorrect && optionsFaulty && (
        <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2.5">
          <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="text-amber-200/90 text-xs leading-relaxed">
            This question was faulty — the correct answer was not one of the four options,
            so no choice could have been right. Flag it below to get your XP back.
          </p>
        </div>
      )}
      {!isCorrect && !optionsFaulty && !answerVerified && (
        <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2.5">
          <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="text-amber-200/90 text-xs leading-relaxed">
            We could not double-check this answer just now, so treat it with caution.
            If you are confident you were right, flag it below and your XP will be restored.
          </p>
        </div>
      )}

      {/* Explanation */}
      <p className="text-gray-200 text-sm leading-relaxed">{explanation}</p>

      {/* Flag as incorrect — unobtrusive */}
      {onFlag && (
        flagged ? (
          <p className="text-xs text-gray-400 italic">
            {isCorrect
              ? "Thanks — we'll review this question."
              : "Thanks — we'll review this question. Your XP has been restored."}
          </p>
        ) : (
          <button
            onClick={() => { setFlagged(true); onFlag() }}
            className="text-xs text-gray-500 hover:text-amber-400 transition-colors"
          >
            ⚑ Flag as incorrect
          </button>
        )
      )}

      {/* Next button */}
      <button
        onClick={onNext}
        className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500
                   text-white font-semibold rounded-xl transition-colors duration-150 mt-2"
      >
        Next question
        <ArrowRight size={16} />
      </button>
    </div>
  )
}
