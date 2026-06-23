import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PitchSlot } from '../components/PitchSlot'
import { SquadMiniCard } from '../components/SquadMiniCard'
import { AssignSheet, type SheetData } from '../components/AssignSheet'
import { FORMATIONS, FORMATION_OPTIONS, slotsFor, isFormation, type Formation } from '../lib/formations'
import type { StudentCard } from '../types'

// TODO: multi-child — replace with the selected child's id from parent context.
const STUDENT_ID = 'bcf5c2fb-1d99-4d1e-9da8-4cc73d4c297f'

export function Squad() {
  const navigate = useNavigate()

  const [cards, setCards] = useState<StudentCard[]>([])
  const [formation, setFormation] = useState<Formation>('4-3-3')
  const [loading, setLoading] = useState(true)
  const [sheet, setSheet] = useState<SheetData | null>(null)
  const [pendingFormation, setPendingFormation] = useState<Formation | null>(null)
  const [celebrate, setCelebrate] = useState(false)

  useEffect(() => {
    async function load() {
      const [profileRes, cardsRes] = await Promise.all([
        supabase.from('profiles').select('formation').eq('id', STUDENT_ID).single(),
        supabase.from('student_cards').select('*, player_cards(*)').eq('student_id', STUDENT_ID),
      ])
      if (isFormation(profileRes.data?.formation)) setFormation(profileRes.data.formation)
      setCards(cardsRes.data ?? [])
      setLoading(false)
    }
    void load()
  }, [])

  const slots = useMemo(() => slotsFor(formation), [formation])
  const slotIds = useMemo(() => new Set(slots.map((s) => s.id)), [slots])

  // A card sits on the bench if it has no slot, or a slot from a different formation.
  const benchCards = cards.filter((c) => !c.squad_position || !slotIds.has(c.squad_position))
  const cardInSlot = (slotId: string) => cards.find((c) => c.squad_position === slotId) ?? null
  const filledCount = slots.filter((s) => cardInSlot(s.id)).length
  const complete = filledCount === slots.length

  // Celebrate the moment the squad becomes complete (not on every render).
  useEffect(() => {
    if (complete && !loading) {
      setCelebrate(true)
      const t = setTimeout(() => setCelebrate(false), 4000)
      return () => clearTimeout(t)
    }
  }, [complete, loading])

  // First open slot whose position matches `pos`, or null if all are filled.
  function openSlotFor(pos: string): string | null {
    return slots.find((s) => s.pos === pos && !cardInSlot(s.id))?.id ?? null
  }

  // Place `card` into `slotId`. If occupied, the two swap (occupant takes card's old spot).
  async function placeCard(card: StudentCard, slotId: string) {
    setSheet(null)
    const occupant = cards.find((c) => c.squad_position === slotId && c.id !== card.id)
    const fromSlot = card.squad_position ?? null
    setCards((prev) =>
      prev.map((c) => {
        if (c.id === card.id) return { ...c, squad_position: slotId }
        if (occupant && c.id === occupant.id) return { ...c, squad_position: fromSlot }
        return c
      }),
    )
    await supabase.from('student_cards').update({ squad_position: slotId }).eq('id', card.id)
    if (occupant) {
      await supabase.from('student_cards').update({ squad_position: fromSlot }).eq('id', occupant.id)
    }
  }

  async function moveToBench(card: StudentCard) {
    setSheet(null)
    setCards((prev) => prev.map((c) => (c.id === card.id ? { ...c, squad_position: null } : c)))
    await supabase.from('student_cards').update({ squad_position: null }).eq('id', card.id)
  }

  async function applyFormation(next: Formation) {
    setPendingFormation(null)
    setFormation(next)
    setCards((prev) => prev.map((c) => ({ ...c, squad_position: null })))
    await Promise.all([
      supabase.from('profiles').update({ formation: next }).eq('id', STUDENT_ID),
      supabase.from('student_cards').update({ squad_position: null }).eq('student_id', STUDENT_ID),
    ])
  }

  function onFormationClick(next: Formation) {
    if (next === formation) return
    setPendingFormation(next)
  }

  function openSlot(slotId: string) {
    const slot = slots.find((s) => s.id === slotId)!
    const occupant = cardInSlot(slotId)
    if (occupant) {
      setSheet({ kind: 'occupied', slot, card: occupant })
    } else {
      const eligible = cards.filter((c) => c.player_cards?.position === slot.pos && c.squad_position !== slotId)
      setSheet({ kind: 'assign', slot, eligible })
    }
  }

  function openBenchCard(card: StudentCard) {
    setSheet({ kind: 'bench', card, targetSlotId: openSlotFor(card.player_cards?.position ?? '') })
  }

  return (
    <div className="min-h-screen bg-gray-950 p-4 md:p-6 max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="pt-1 flex items-start justify-between">
        <h1 className="text-white text-2xl font-bold">My Squad</h1>
        <button
          onClick={() => navigate('/store')}
          className="text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors"
        >
          Card Store →
        </button>
      </div>

      {/* Formation toggle */}
      <div className="flex gap-2">
        {FORMATION_OPTIONS.map((f) => (
          <button
            key={f}
            onClick={() => onFormationClick(f)}
            className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${
              formation === f
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Completion bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-300 font-medium">Your Squad: {filledCount} / {slots.length} players</span>
          {complete && <span className="text-green-400 font-semibold">Complete ✓</span>}
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all duration-300"
            style={{ width: `${(filledCount / slots.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Squad complete banner */}
      {celebrate && (
        <div className="bg-green-900/50 border border-green-600 rounded-xl px-4 py-3 text-center text-green-300 font-bold animate-pulse">
          🏆 Squad Complete!
        </div>
      )}

      {/* Pitch */}
      {loading ? (
        <div className="h-[520px] bg-gray-900 animate-pulse rounded-2xl" />
      ) : (
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-b from-green-800 to-green-900 border border-green-950/50 min-h-[520px] p-4">
          {/* Markings (CSS only) */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute top-1/2 left-0 right-0 border-t border-white/20" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border border-white/20" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/30" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-14 border border-t-0 border-white/20" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-14 border border-b-0 border-white/20" />
          </div>

          {/* Slots */}
          <div className="relative z-10 flex flex-col justify-between h-full min-h-[488px] gap-3">
            {FORMATIONS[formation].map((row, i) => (
              <div key={i} className="flex justify-center gap-3 md:gap-5">
                {row.map((slot) => (
                  <PitchSlot key={slot.id} slot={slot} card={cardInSlot(slot.id)} onTap={() => openSlot(slot.id)} />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bench */}
      {!loading && (
        <div className="space-y-2">
          <h2 className="text-gray-300 text-sm font-semibold">Bench ({benchCards.length} players)</h2>
          {benchCards.length === 0 ? (
            <p className="text-gray-600 text-xs">
              {cards.length === 0
                ? 'No cards yet — earn XP and sign players in the store.'
                : 'Every player is on the pitch.'}
            </p>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {benchCards.map((sc) => sc.player_cards && (
                <button key={sc.id} onClick={() => openBenchCard(sc)} className="shrink-0 active:scale-95 transition-transform">
                  <SquadMiniCard card={sc.player_cards} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Assign / remove sheet */}
      {sheet && (
        <AssignSheet
          data={sheet}
          onClose={() => setSheet(null)}
          onPickForSlot={placeCard}
          onRemove={moveToBench}
          onAssignBench={placeCard}
          onGoStore={() => navigate('/store')}
        />
      )}

      {/* Formation switch confirmation */}
      {pendingFormation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full space-y-4">
            <div>
              <h2 className="text-white font-semibold text-lg">Switch to {pendingFormation}?</h2>
              <p className="text-gray-400 text-sm mt-1">Switching formation will reset your squad. Continue?</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setPendingFormation(null)}
                className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-xl font-semibold text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { void applyFormation(pendingFormation) }}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-sm transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
