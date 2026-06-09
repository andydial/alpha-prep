import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useUser } from '../hooks/useUser'
import { getLevelForXP } from '../lib/curriculum'
import { PlayerCardTile } from '../components/PlayerCardTile'
import type { PlayerCard } from '../types'

function getDailyRotation(all: PlayerCard[], ownedIds: Set<string>): PlayerCard[] {
  const available = all.filter(c => c.active && !ownedIds.has(c.id))
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

export function Store() {
  const navigate = useNavigate()
  const { user, profile } = useUser()

  const [allCards, setAllCards] = useState<PlayerCard[]>([])
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set())
  const [xpBalance, setXpBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState<string | null>(null)
  const [justBought, setJustBought] = useState<string | null>(null)

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

  async function handleBuy(card: PlayerCard) {
    if (!user?.id || xpBalance < card.xp_cost || buying) return
    setBuying(card.id)

    const { error: insertErr } = await supabase
      .from('student_cards')
      .insert({ student_id: user.id, card_id: card.id, xp_spent: card.xp_cost })

    if (insertErr) { setBuying(null); return }

    const newXP = xpBalance - card.xp_cost
    const newLevel = getLevelForXP(newXP).level
    await supabase
      .from('profiles')
      .update({ xp_total: newXP, level: newLevel })
      .eq('id', user.id)

    setXpBalance(newXP)
    setOwnedIds(prev => new Set([...prev, card.id]))
    setBuying(null)
    setJustBought(card.id)
    setTimeout(() => setJustBought(null), 2500)
  }

  const dailyCards = loading ? [] : getDailyRotation(allCards, ownedIds)
  const ownedCount = ownedIds.size

  return (
    <div className="min-h-screen bg-gray-950 p-4 md:p-8 max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="pt-2 flex items-start justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold">Card Store</h1>
          <p className="text-gray-400 text-sm mt-0.5">Daily selection · refreshes tomorrow</p>
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

      {/* Daily cards */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-56 bg-gray-800 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : dailyCards.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-2xl mb-2">🏆</p>
          <p className="font-medium">You own every card!</p>
          <p className="text-sm mt-1">Collect them all — legend achieved.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {dailyCards.map(card => (
            <PlayerCardTile
              key={card.id}
              card={card}
              owned={ownedIds.has(card.id)}
              xpBalance={xpBalance}
              buying={buying === card.id}
              onBuy={() => { void handleBuy(card) }}
            />
          ))}
        </div>
      )}

      {/* All cards teaser */}
      {!loading && allCards.length > 0 && (
        <p className="text-center text-gray-600 text-xs">
          {ownedCount} of {allCards.length} cards collected · 6 new cards shown daily
        </p>
      )}

      <div className="h-4" />
    </div>
  )
}
