import { kanaPairs } from '../../core/kana/catalog'

export const selectionTransitionMs = 120
const maxCascadeDelayMs = 400 - selectionTransitionMs
const soundSpacingMs = 45

export function planSelectionFeedback(
  ids: readonly string[],
  currentSelection: readonly string[],
  selected: boolean,
) {
  const requested = new Set(ids)
  const current = new Set(currentSelection)
  // Catalog order follows the visible rows, including gaps and paired scripts.
  const changed = kanaPairs.filter(
    (pair) => requested.has(pair.id) && current.has(pair.id) !== selected,
  )
  const step = Math.min(
    soundSpacingMs,
    maxCascadeDelayMs / Math.max(1, changed.length - 1),
  )
  const delays = new Map(changed.map((pair, index) => [pair.id, index * step]))
  const soundDelays: number[] = []
  for (const delay of delays.values()) {
    const last = soundDelays.at(-1)
    if (last === undefined || delay - last >= soundSpacingMs)
      soundDelays.push(delay)
  }
  return { delays, soundDelays }
}

export interface SelectionFeedback {
  revision: number
  delays: ReadonlyMap<string, number>
}
