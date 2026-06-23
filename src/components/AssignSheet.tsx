import type { StudentCard } from '../types'
import type { Slot } from '../lib/formations'
import { SquadMiniCard } from './SquadMiniCard'

export type SheetData =
  // Tapped an empty slot — pick an eligible owned card to assign.
  | { kind: 'assign'; slot: Slot; eligible: StudentCard[] }
  // Tapped a filled slot — view the player, move to bench or cancel.
  | { kind: 'occupied'; slot: Slot; card: StudentCard }
  // Tapped a bench card — assign it to the first open eligible slot.
  | { kind: 'bench'; card: StudentCard; targetSlotId: string | null }

interface AssignSheetProps {
  data: SheetData
  onClose: () => void
  onPickForSlot: (card: StudentCard, slotId: string) => void
  onRemove: (card: StudentCard) => void
  onAssignBench: (card: StudentCard, slotId: string) => void
  onGoStore: () => void
}

export function AssignSheet({
  data,
  onClose,
  onPickForSlot,
  onRemove,
  onAssignBench,
  onGoStore,
}: AssignSheetProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-2xl bg-gray-900 border-t border-gray-700 rounded-t-2xl p-5 space-y-4 max-h-[75vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grab handle */}
        <div className="mx-auto h-1 w-10 rounded-full bg-gray-700" />

        {data.kind === 'assign' && (
          <>
            <h2 className="text-white font-semibold text-lg">Assign {data.slot.label}</h2>
            {data.eligible.length === 0 ? (
              <div className="text-center py-6 space-y-3">
                <p className="text-gray-400 text-sm">No {data.slot.pos} cards yet — visit the store!</p>
                <button
                  onClick={onGoStore}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-sm transition-colors"
                >
                  Go to Card Store
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {data.eligible.map((sc) => sc.player_cards && (
                  <button
                    key={sc.id}
                    onClick={() => onPickForSlot(sc, data.slot.id)}
                    className="w-full flex items-center gap-3 bg-gray-800 hover:bg-gray-700 rounded-xl p-2 pr-3 transition-colors text-left"
                  >
                    <SquadMiniCard card={sc.player_cards} />
                    <span className="flex-1 text-white text-sm font-medium truncate">{sc.player_cards.name}</span>
                    <span className="text-xs font-semibold text-blue-400">
                      {sc.squad_position ? 'Move here' : 'Assign'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {data.kind === 'occupied' && data.card.player_cards && (
          <>
            <h2 className="text-white font-semibold text-lg">{data.card.player_cards.name}</h2>
            <div className="flex justify-center py-2">
              <SquadMiniCard card={data.card.player_cards} />
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-xl font-semibold text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => onRemove(data.card)}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-semibold text-sm transition-colors"
              >
                Move to Bench
              </button>
            </div>
          </>
        )}

        {data.kind === 'bench' && data.card.player_cards && (
          <>
            <h2 className="text-white font-semibold text-lg">{data.card.player_cards.name}</h2>
            <div className="flex items-center gap-3 py-2">
              <SquadMiniCard card={data.card.player_cards} />
              <p className="text-gray-400 text-sm">
                Plays <span className="text-white font-semibold">{data.card.player_cards.position ?? '—'}</span>
              </p>
            </div>
            {data.targetSlotId ? (
              <button
                onClick={() => onAssignBench(data.card, data.targetSlotId!)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-sm transition-colors"
              >
                Assign to pitch
              </button>
            ) : (
              <p className="text-center text-sm text-gray-500 py-2">
                All {data.card.player_cards.position} slots are filled — tap a slot to swap.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
