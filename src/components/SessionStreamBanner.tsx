import type { Domain, DomainPair } from '../types'
import { DOMAIN_NAMES } from '../lib/curriculum'

interface SessionStreamBannerProps {
  domainPair: DomainPair
  activeDomain: Domain
  questionNumber: number
  streamBoundary?: number
}

export function SessionStreamBanner({
  domainPair,
  activeDomain,
}: SessionStreamBannerProps) {
  const [d1, d2] = domainPair
  const isD1Active = activeDomain === d1

  const DOMAIN_COLOUR: Record<Domain, string> = {
    maths:    'text-blue-400 bg-blue-500/15 border-blue-500/30',
    reading:  'text-purple-400 bg-purple-500/15 border-purple-500/30',
    verbal:   'text-amber-400 bg-amber-500/15 border-amber-500/30',
    abstract: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30',
    writing:  'text-green-400 bg-green-500/15 border-green-500/30',
  }

  return (
    <div className="flex items-center gap-2 px-1 mb-1">
      <span className="text-xs text-gray-500 font-medium uppercase tracking-wide mr-1">
        Today's blocks
      </span>
      <DomainChip domain={d1} active={isD1Active} colour={DOMAIN_COLOUR[d1]} />
      <span className="text-gray-600 text-xs">+</span>
      <DomainChip domain={d2} active={!isD1Active} colour={DOMAIN_COLOUR[d2]} />
    </div>
  )
}

function DomainChip({
  domain, active, colour,
}: { domain: Domain; active: boolean; colour: string }) {
  return (
    <span className={`
      inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border
      transition-all duration-300
      ${active ? colour : 'text-gray-600 bg-gray-800/50 border-gray-700/50'}
    `}>
      {active && <span className="w-1.5 h-1.5 rounded-full bg-current inline-block" />}
      {DOMAIN_NAMES[domain]}
    </span>
  )
}
