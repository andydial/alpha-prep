import type { DomainPair } from '../types'
import { DOMAIN_NAMES } from '../lib/curriculum'

interface StreamTransitionScreenProps {
  domainPair: DomainPair
  onContinue: () => void
}

export function StreamTransitionScreen({ domainPair, onContinue }: StreamTransitionScreenProps) {
  const [d1, d2] = domainPair
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 text-center space-y-5">
      <div className="w-12 h-12 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center mx-auto">
        <span className="text-green-400 text-xl font-bold">✓</span>
      </div>
      <div>
        <p className="text-white text-xl font-bold">Great work on {DOMAIN_NAMES[d1]}!</p>
        <p className="text-gray-400 mt-2 text-sm leading-relaxed">
          Now switching to{' '}
          <span className="text-white font-semibold">{DOMAIN_NAMES[d2]}</span>{' '}
          for the second half of your session.
        </p>
      </div>
      <button
        onClick={onContinue}
        className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors"
      >
        Start {DOMAIN_NAMES[d2]} →
      </button>
    </div>
  )
}
