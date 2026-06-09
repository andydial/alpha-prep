import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useUser } from '../hooks/useUser'
import { PlayerCardTile } from '../components/PlayerCardTile'
import type { StudentCard } from '../types'

type SortKey = 'rating' | 'tier' | 'latest'

const TIER_ORDER = { legend: 0, elite: 1, gold: 2, silver: 3, bronze: 4 }

export function Squad() {
  const navigate = useNavigate()
  const { user } = useUser()

  const [cards, setCards] = useState<StudentCard[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<SortKey>('rating')

  useEffect(() => {
    if (!user?.id) return
    supabase
      .from('student_cards')
      .select('*, player_cards(*)')
      .eq('student_id', user.id)
      .then(({ data }) => {
        setCards(data ?? [])
        setLoading(false)
      })
  }, [user?.id])

  const sorted = [...cards].sort((a, b) => {
    const ca = a.player_cards
    const cb = b.player_cards
    if (!ca || !cb) return 0
    if (sort === 'rating') return cb.rating - ca.rating
    if (sort === 'tier') return (TIER_ORDER[ca.tier] ?? 9) - (TIER_ORDER[cb.tier] ?? 9)
    return new Date(b.purchased_at).getTime() - new Date(a.purchased_at).getTime()
  })

  return (
    <div className="min-h-screen bg-gray-950 p-4 md:p-8 max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="pt-2 flex items-start justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold">My Squad</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {loading ? '…' : `${cards.length} card${cards.length !== 1 ? 's' : ''} collected`}
          </p>
        </div>
        <button
          onClick={() => navigate('/store')}
          className="text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors"
        >
          Card Store →
        </button>
      </div>

      {/* Sort controls */}
      {cards.length > 1 && (
        <div className="flex gap-2">
          {([['rating', 'Rating'], ['tier', 'Tier'], ['latest', 'Latest']] as [SortKey, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSort(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                sort === key
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Card grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-56 bg-gray-800 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : cards.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <p className="text-4xl">⚽</p>
          <p className="text-white font-semibold">No cards yet</p>
          <p className="text-gray-400 text-sm">Complete sessions to earn XP, then spend it in the store.</p>
          <button
            onClick={() => navigate('/store')}
            className="mt-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-sm transition-colors"
          >
            Go to Card Store
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {sorted.map(sc => sc.player_cards && (
            <PlayerCardTile
              key={sc.id}
              card={sc.player_cards}
              owned
              purchasedAt={sc.purchased_at}
            />
          ))}
        </div>
      )}

      <div className="h-4" />
    </div>
  )
}
