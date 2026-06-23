import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useUser } from '../hooks/useUser'
import { getLevelForXP } from '../lib/curriculum'
import { PlayerCardTile } from '../components/PlayerCardTile'
import type { PlayerCard } from '../types'

type PositionFilter = 'all' | 'GK' | 'DEF' | 'MID' | 'FWD'

const FILTERS: { key: PositionFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'GK', label: 'GK' },
  { key: 'DEF', label: 'DEF' },
  { key: 'MID', label: 'MID' },
  { key: 'FWD', label: 'FWD' },
]

// Maps a player position to its filter group.
function positionGroup(position: string | null): Exclude<PositionFilter, 'all'> | null {
  switch (position) {
    case 'GK': return 'GK'
    case 'CB': case 'LB': case 'RB': return 'DEF'
    case 'CM': case 'LM': case 'RM': return 'MID'
    case 'ST': case 'LW': case 'RW': return 'FWD'
    default: return null
  }
}

// Stable daily set of 6 cards, seeded by calendar date. Owned cards remain in
// the set (rendered greyed) so the selection does not shift as cards are bought.
function getDailyRotation(all: PlayerCard[]): PlayerCard[] {
  const available = all.filter(c => c.active)
  const seed = new Date().toISOString().split('T')[0]
  let h = 0
  for (let i = 0; i < seed.length; i++) h = Math.imul(31, h) + seed.charCodeAt(i) | 0
  const shuffled = [...available]
  for (let i = shuffled.length - 1; i > 0; i--) {
    h = Math.imul(31, h) + i | 0
    const j = Math.abs(h) % (i + 1)
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled.slice(0, Math.min(6, shuffled.length))
}

// Formats milliseconds until local midnight as "Xh Ym".
function formatRefreshCountdown(): string {
  const now = new Date()
  const midnight = new Date(now)
  midnight.setHours(24, 0, 0, 0)
  const diff = midnight.getTime() - now.getTime()
  const hours = Math.floor(diff / 3_600_000)
  const mins = Math.floor((diff % 3_600_000) / 60_000)
  return `${hours}h ${mins}m`
}

export function Store() {
  const navigate = useNavigate()
  const { user, profile } = useUser()

  const [allCards, setAllCards] = useState<PlayerCard[]>([])
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set())
  const [xpBalance, setXpBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState<string | null>(null)
  const [justBought, setJustBought] = useState<string | null>(null)
  const [filter, setFilter] = useState<PositionFilter>('all')
  const [confirmCard, setConfirmCard] = useState<PlayerCard | null>(null)
  const [countdown, setCountdown] = useState(formatRefreshCountdown())

  useEffect(() => {
    if (!user?.id || !profile) return
    setXpBalance(profile.xp_total)

    async function load() {
      const [cardsRes, ownedRes] = await Promise.all([
        supabase.from('player_cards').select('*').eq('active', true).order('rating', { ascending: false }),
        supabase.from('student_cards').select('card_id').eq('student_id', user!.id),
      ])
      setAllCards(cardsRes.data ?? [])
      setOwnedIds(new Set((ownedRes.data ?? []).map(r => r.card_id)))
      setLoading(false)
    }
    void load()
  }, [user?.id, profile?.xp_total])

  // Tick the refresh countdown every 30s.
  useEffect(() => {
    const id = setInterval(() => setCountdown(formatRefreshCountdown()), 30_000)
    return () => clearInterval(id)
  }, [])

  async function handleBuy(card: PlayerCard) {
    if (!user?.id || xpBalance < card.xp_cost || buying) return
    setBuying(card.id)

    const { error: insertErr } = await supabase
      .from('student_cards')
      .insert({ student_id: user.id, card_id: card.id, xp_spent: card.xp_cost })

    if (insertErr) { setBuying(null); setConfirmCard(null); return }

    const newXP = xpBalance - card.xp_cost
    const newLevel = getLevelForXP(newXP).level
    await supabase
      .from('profiles')
      .update({ xp_total: newXP, level: newLevel })
      .eq('id', user.id)

    setXpBalance(newXP)
    setOwnedIds(prev => new Set([...prev, card.id]))
    setBuying(null)
    setConfirmCard(null)
    setJustBought(card.id)
    setTimeout(() => setJustBought(null), 2500)
  }

  const dailyCards = loading ? [] : getDailyRotation(allCards)
  const visibleCards = filter === 'all'
    ? dailyCards
    : dailyCards.filter(c => positionGroup(c.position) === filter)
  const ownedCount = ownedIds.size

  return (
    <div className="min-h-screen bg-gray-950 p-4 md:p-8 max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="pt-2 flex items-start justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold">Card Store</h1>
          <p className="text-gray-400 text-sm mt-0.5">Store refreshes in {countdown}</p>
        </div>
        <button
          onClick={() => navigate('/squad')}
          className="text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors"
        >
          My Squad ({ownedCount}) →
        </button>
      </div>

      {/* XP balance */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl px-5 py-3 flex items-center justify-between">
        <span className="text-gray-400 text-sm">Your XP balance</span>
        <span className="text-white font-bold text-lg">
          {loading ? '…' : xpBalance.toLocaleString()} XP
        </span>
      </div>

      {/* Just bought banner */}
      {justBought && (
        <div className="bg-green-900/40 border border-green-700/50 rounded-xl px-4 py-3 text-sm text-green-400 font-medium text-center">
          ✓ Card added to your squad!
        </div>
      )}

      {/* Filter bar */}
      <div className="flex items-center gap-2">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === f.key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Daily cards */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-56 bg-gray-800 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : visibleCards.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-2xl mb-2">⚽</p>
          <p className="font-medium">
            {filter === 'all' ? 'No cards available today' : 'No cards in this position today'}
          </p>
          {filter !== 'all' && (
            <button
              onClick={() => setFilter('all')}
              className="text-sm text-blue-400 hover:text-blue-300 mt-1"
            >
              Show all positions
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {visibleCards.map(card => (
            <PlayerCardTile
              key={card.id}
              card={card}
              owned={ownedIds.has(card.id)}
              xpBalance={xpBalance}
              buying={buying === card.id}
              onBuy={() => setConfirmCard(card)}
            />
          ))}
        </div>
      )}

      {/* Collection teaser */}
      {!loading && allCards.length > 0 && (
        <p className="text-center text-gray-600 text-xs">
          {ownedCount} of {allCards.length} cards collected · 6 new cards shown daily
        </p>
      )}

      <div className="h-4" />

      {/* Purchase confirmation modal */}
      {confirmCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full space-y-4">
            <div>
              <h2 className="text-white font-semibold text-lg">
                Sign {confirmCard.name}?
              </h2>
              <p className="text-gray-400 text-sm mt-1">
                This costs <span className="text-white font-semibold">{confirmCard.xp_cost.toLocaleString()} XP</span>.
                You'll have {(xpBalance - confirmCard.xp_cost).toLocaleString()} XP left.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmCard(null)}
                disabled={buying !== null}
                className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-xl font-semibold text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { void handleBuy(confirmCard) }}
                disabled={buying !== null}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-60"
              >
                {buying ? 'Signing…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
