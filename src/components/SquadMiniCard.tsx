import type { PlayerCard, CardTier } from '../types'

const TIER_BORDER: Record<CardTier, string> = {
  bronze: 'border-amber-500',
  silver: 'border-slate-400',
  gold: 'border-yellow-400',
  elite: 'border-violet-400',
  legend: 'border-orange-400',
}

const TIER_TEXT: Record<CardTier, string> = {
  bronze: 'text-amber-300',
  silver: 'text-slate-200',
  gold: 'text-yellow-300',
  elite: 'text-violet-300',
  legend: 'text-orange-300',
}

// Compact card used on pitch slots and the bench — rating + name, tier-coloured border.
export function SquadMiniCard({ card, className = '' }: { card: PlayerCard; className?: string }) {
  return (
    <div
      className={`w-16 rounded-lg border-2 ${TIER_BORDER[card.tier]} bg-gray-900/95 px-1 pt-1 pb-1.5 flex flex-col items-center shadow-lg ${className}`}
    >
      <span className={`font-black text-lg leading-none ${TIER_TEXT[card.tier]}`}>{card.rating}</span>
      <span className="text-white text-[10px] font-semibold leading-tight w-full text-center truncate">
        {card.name}
      </span>
    </div>
  )
}
