// Formation definitions for the squad pitch screen.
// Rows are ordered top -> bottom (GK at the top, attack at the bottom),
// matching how they render on the vertical pitch.

export type Formation = '4-3-3' | '4-4-2'

export interface Slot {
  id: string    // unique slot id, e.g. 'CB1' (stored in student_cards.squad_position)
  pos: string   // eligible player position used for filtering, e.g. 'CB'
  label: string // display label
}

const gk: Slot = { id: 'GK', pos: 'GK', label: 'GK' }
const backFour: Slot[] = [
  { id: 'LB', pos: 'LB', label: 'LB' },
  { id: 'CB1', pos: 'CB', label: 'CB' },
  { id: 'CB2', pos: 'CB', label: 'CB' },
  { id: 'RB', pos: 'RB', label: 'RB' },
]

export const FORMATIONS: Record<Formation, Slot[][]> = {
  '4-3-3': [
    [gk],
    backFour,
    [
      { id: 'LM', pos: 'LM', label: 'LM' },
      { id: 'CM', pos: 'CM', label: 'CM' },
      { id: 'RM', pos: 'RM', label: 'RM' },
    ],
    [
      { id: 'LW', pos: 'LW', label: 'LW' },
      { id: 'ST', pos: 'ST', label: 'ST' },
      { id: 'RW', pos: 'RW', label: 'RW' },
    ],
  ],
  '4-4-2': [
    [gk],
    backFour,
    [
      { id: 'LM', pos: 'LM', label: 'LM' },
      { id: 'CM1', pos: 'CM', label: 'CM' },
      { id: 'CM2', pos: 'CM', label: 'CM' },
      { id: 'RM', pos: 'RM', label: 'RM' },
    ],
    [
      { id: 'ST1', pos: 'ST', label: 'ST' },
      { id: 'ST2', pos: 'ST', label: 'ST' },
    ],
  ],
}

export const FORMATION_OPTIONS: Formation[] = ['4-3-3', '4-4-2']

export function isFormation(value: string | null | undefined): value is Formation {
  return value === '4-3-3' || value === '4-4-2'
}

// Flat list of all 11 slots for a formation.
export function slotsFor(formation: Formation): Slot[] {
  return FORMATIONS[formation].flat()
}
