import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { PreferencesContext } from './context'
import {
  savePreferences,
  type Preferences,
  type PreferenceStorage,
} from './storage'

interface Props {
  initialPreferences: Preferences
  initialSaved: boolean
  storage: PreferenceStorage | undefined
  children: ReactNode
}

export function PreferencesProvider({
  initialPreferences,
  initialSaved,
  storage,
  children,
}: Props) {
  const [preferences, setPreferences] = useState(initialPreferences)
  const [saved, setSaved] = useState(initialSaved)
  const { i18n } = useTranslation()

  function commit(next: Preferences) {
    setPreferences(next)
    setSaved(savePreferences(next, storage))
  }

  return (
    <PreferencesContext
      value={{
        preferences,
        saved,
        setVolume(channel, volume) {
          if (Number.isFinite(volume))
            commit({
              ...preferences,
              [channel]: Math.max(0, Math.min(1, volume)),
            })
        },
        setVoice(voice) {
          commit({ ...preferences, voice })
        },
        setLanguage(language) {
          commit({ ...preferences, language })
          void i18n.changeLanguage(language)
        },
        setMode(mode) {
          commit({ ...preferences, mode })
        },
        setSelected(ids, selected) {
          const next = new Set(preferences.selectedPairIds)
          for (const id of ids) {
            if (selected) next.add(id)
            else next.delete(id)
          }
          commit({ ...preferences, selectedPairIds: [...next] })
        },
      }}
    >
      {children}
    </PreferencesContext>
  )
}
