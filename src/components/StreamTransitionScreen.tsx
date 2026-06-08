import type { DomainPair } from '../types'
import { DOMAIN_NAMES } from '../lib/curriculum'

interface StreamTransitionScreenProps {
  domainPair: DomainPair
  correctCount: number
  questionsInBlock: number
  onContinue: () => void
}

export function StreamTransitionScreen({
  domainPair,
  correctCount,
  questionsInBlock,
  onContinue,
}: StreamTransitionScreenProps) {
  const [, d2] = domainPair
  const accuracy = questionsInBlock > 0 ? Math.round((correctCount / questionsInBlock) * 100) : 0
  const accuracyColour =
    accuracy >= 75 ? 'text-green-400' :
    accuracy >= 50 ? 'text-amber-400' :
    'text-red-400'

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 text-center space-y-6">
      {/* Check icon */}
      <div className="w-14 h-14 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center mx-auto">
        <span className="text-green-400 text-2xl font-bold">✓</span>
      </div>

      {/* Heading + score */}
      <div className="space-y-3">
        <p className="text-white text-2xl font-bold">Block 1 Complete!</p>

        <div className="inline-flex items-center gap-2 bg-gray-800 rounded-full px-4 py-2">
          <span className={`text-lg font-bold ${accuracyColour}`}>
            {correctCount}/{questionsInBlock}
          </span>
          <span className="text-gray-400 text-sm">correct</span>
          <span className="text-gray-600 text-sm">·</span>
          <span className={`text-sm font-semibold ${accuracyColour}`}>{accuracy}%</span>
        </div>
      </div>

      {/* Transition message */}
      <div className="space-y-1">
        <p className="text-gray-400 text-sm">Now starting Block 2</p>
        <p className="text-white text-lg font-semibold">{DOMAIN_NAMES[d2]}</p>
      </div>

      <button
        onClick={onContinue}
        className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors text-base"
      >
        Start Block 2: {DOMAIN_NAMES[d2]} →
      </button>
    </div>
  )
}
