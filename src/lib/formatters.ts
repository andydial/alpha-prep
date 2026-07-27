/** Shared display formatters for the parent reporting screens. */

/** 1847 -> "30m", 5400 -> "1h 30m", 45 -> "45s". */
export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return '—'
  if (seconds < 60) return `${seconds}s`
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

/** ISO -> "Sun 27 Jul". */
export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

/** ISO -> "4:15pm". */
export function formatTime(iso: string): string {
  return new Date(iso)
    .toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true })
    .replace(/\s/g, '')
    .toLowerCase()
}

/** ISO -> "Sunday 27 July 2026, 4:15pm". */
export function formatFullDateTime(iso: string): string {
  const d = new Date(iso)
  const date = d.toLocaleDateString('en-AU', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  return `${date}, ${formatTime(iso)}`
}

/** Tailwind text colour for an accuracy percentage. */
export function accuracyColour(pct: number): string {
  if (pct < 50) return 'text-red-400'
  if (pct < 75) return 'text-amber-400'
  return 'text-green-400'
}

/** Tailwind background colour for an accuracy bar. */
export function accuracyBarColour(pct: number): string {
  if (pct < 50) return 'bg-red-500'
  if (pct < 75) return 'bg-amber-500'
  return 'bg-green-500'
}
