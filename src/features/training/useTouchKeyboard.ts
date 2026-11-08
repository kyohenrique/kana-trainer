import { useSyncExternalStore } from 'react'

// Narrow windows and touch-first devices keep the integrated keyboard on rotation.
const query = '(max-width: 767px), (pointer: coarse)'
const snapshot = () => window.matchMedia?.(query).matches ?? false
function subscribe(notify: () => void) {
  const media = window.matchMedia?.(query)
  media?.addEventListener('change', notify)
  return () => media?.removeEventListener('change', notify)
}

export function useTouchKeyboard() {
  return useSyncExternalStore(subscribe, snapshot, () => false)
}
