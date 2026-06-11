import { CheckCircle, XCircle, ArrowRight } from 'lucide-react'

interface ExplanationPanelProps {
  isCorrect: boolean
  correctAnswer: string
  explanation: string
  hintUsed: boolean
  xpEarned: number
  onNext: () => void
}

export function ExplanationPanel({
  isCorrect,
  correctAnswer,
  explanation,
  hintUsed,
  xpEarned,
  onNext,
}: ExplanationPanelProps) {
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

      {/* Explanation */}
      <p className="text-gray-200 text-sm leading-relaxed">{explanation}</p>

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
