import { createContext, useContext } from 'react'
import type { ScriptMode } from '../../core/kana/catalog'
import type { Language, Preferences, Voice } from './storage'

export interface PreferencesContextValue {
  preferences: Preferences
  setVolume: (
    channel: 'effectsVolume' | 'pronunciationVolume',
    volume: number,
  ) => void
  setVoice: (voice: Voice) => void
  saved: boolean
  setLanguage: (language: Language) => void
  setMode: (mode: ScriptMode) => void
  setSelected: (ids: readonly string[], selected: boolean) => void
}

export const PreferencesContext = createContext<PreferencesContextValue | null>(
  null,
)

export function usePreferences(): PreferencesContextValue {
  const value = useContext(PreferencesContext)
  if (!value)
    throw new Error('usePreferences must be used within PreferencesProvider')
  return value
}
