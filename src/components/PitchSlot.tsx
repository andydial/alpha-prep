import type { StudentCard } from '../types'
import type { Slot } from '../lib/formations'
import { SquadMiniCard } from './SquadMiniCard'

interface PitchSlotProps {
  slot: Slot
  card: StudentCard | null
  onTap: () => void
}

// One position on the pitch — empty silhouette or a filled mini-card.
export function PitchSlot({ slot, card, onTap }: PitchSlotProps) {
  if (card?.player_cards) {
    return (
      <button onClick={onTap} className="flex flex-col items-center gap-0.5 w-16">
        <SquadMiniCard card={card.player_cards} />
        <span className="text-[10px] font-bold text-white/80">{slot.label}</span>
      </button>
    )
  }

  return (
    <button
      onClick={onTap}
      className="flex flex-col items-center justify-center gap-0.5 w-16 h-16 rounded-full border-2 border-dashed border-white/40 bg-black/25 hover:bg-black/40 active:scale-95 transition-all"
    >
      <span className="text-white/60 text-xl leading-none">+</span>
      <span className="text-[10px] font-bold text-white/70">{slot.label}</span>
    </button>
  )
}
