import type { PlayerCard, CardTier } from '../types'

const TIER_STYLES: Record<CardTier, {
  bg: string; border: string; ratingColor: string; statColor: string; badge: string
}> = {
  bronze: {
    bg: 'from-amber-950 via-amber-900 to-amber-800',
    border: 'border-amber-500',
    ratingColor: 'text-amber-200',
    statColor: 'text-amber-300',
    badge: 'bg-amber-700 text-amber-100',
  },
  silver: {
    bg: 'from-slate-800 via-slate-700 to-slate-600',
    border: 'border-slate-400',
    ratingColor: 'text-slate-100',
    statColor: 'text-slate-300',
    badge: 'bg-slate-500 text-slate-100',
  },
  gold: {
    bg: 'from-yellow-950 via-yellow-900 to-amber-800',
    border: 'border-yellow-400',
    ratingColor: 'text-yellow-200',
    statColor: 'text-yellow-300',
    badge: 'bg-yellow-700 text-yellow-100',
  },
  elite: {
    bg: 'from-violet-950 via-purple-900 to-violet-800',
    border: 'border-violet-400',
    ratingColor: 'text-violet-200',
    statColor: 'text-violet-300',
    badge: 'bg-violet-700 text-violet-100',
  },
  legend: {
    bg: 'from-red-950 via-orange-900 to-yellow-900',
    border: 'border-orange-400',
    ratingColor: 'text-orange-200',
    statColor: 'text-orange-300',
    badge: 'bg-orange-700 text-orange-100',
  },
}

const TIER_LABEL: Record<CardTier, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  elite: 'Elite',
  legend: '★ Legend',
}

interface PlayerCardTileProps {
  card: PlayerCard
  owned?: boolean
  xpBalance?: number
  buying?: boolean
  onBuy?: () => void
  purchasedAt?: string
}

export function PlayerCardTile({
  card,
  owned = false,
  xpBalance,
  buying = false,
  onBuy,
  purchasedAt,
}: PlayerCardTileProps) {
  const s = TIER_STYLES[card.tier]
  const canAfford = xpBalance !== undefined && xpBalance >= card.xp_cost

  const stats: [string, number | null][] = [
    ['PAC', card.pace],
    ['SHO', card.shooting],
    ['PAS', card.passing],
    ['DRI', card.dribbling],
    ['DEF', card.defending],
    ['PHY', card.physical],
  ]

  return (
    <div className={`bg-gradient-to-b ${s.bg} border-2 ${s.border} rounded-2xl p-3 flex flex-col gap-2`}>
      {/* Rating + position + tier badge */}
      <div className="flex items-start justify-between">
        <div className="flex items-baseline gap-2">
          <span className={`font-black text-3xl leading-none ${s.ratingColor}`}>{card.rating}</span>
          {card.position && (
            <span className={`text-xs font-bold ${s.statColor}`}>{card.position}</span>
          )}
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.badge}`}>
          {TIER_LABEL[card.tier]}
        </span>
      </div>

      {/* Name */}
      <p className="text-white font-bold text-sm leading-tight text-center min-h-[2.5rem] flex items-center justify-center">
        {card.name}
      </p>

      {/* Divider */}
      <div className={`h-px opacity-30 ${s.border} border-t`} />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
        {stats.map(([label, val]) => (
          <div key={label} className="flex justify-between text-xs">
            <span className="text-gray-400">{label}</span>
            <span className={`font-bold ${s.statColor}`}>{val ?? '—'}</span>
          </div>
        ))}
      </div>

      {/* Footer: buy / owned / date */}
      {owned ? (
        <div className="text-center text-xs text-green-400 font-semibold pt-0.5">
          ✓ In Squad{purchasedAt ? ` · ${new Date(purchasedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}` : ''}
        </div>
      ) : onBuy ? (
        <button
          onClick={onBuy}
          disabled={!canAfford || buying}
          className={`w-full py-1.5 rounded-xl text-xs font-semibold transition-colors mt-0.5 ${
            canAfford
              ? 'bg-blue-600 hover:bg-blue-500 text-white'
              : 'bg-gray-800 text-gray-500 cursor-not-allowed'
          }`}
        >
          {buying ? 'Buying…' : canAfford
            ? `Buy · ${card.xp_cost.toLocaleString()} XP`
            : `${card.xp_cost.toLocaleString()} XP`}
        </button>
      ) : null}
    </div>
  )
}
