import {
  defaultSelection,
  kanaCatalog,
  kanaPairIds,
  type ScriptMode,
} from '../../core/kana/catalog'

export type Language = 'pt' | 'en'
export interface Preferences {
  language: Language
  mode: ScriptMode
  selectedPairIds: string[]
}

export const preferencesKey = 'kana-trainer:preferences:v2'
const legacyPreferencesKey = 'kana-trainer:preferences:v1'
const legacyPairs = new Map(kanaCatalog.map((kana) => [kana.id, kana.pairId]))
export type PreferenceStorage = Pick<Storage, 'getItem' | 'setItem'>

export function detectLanguage(browserLanguage: string): Language {
  return ['pt', 'pt-br', 'pt-pt'].includes(browserLanguage.toLowerCase())
    ? 'pt'
    : 'en'
}

export function createDefaultPreferences(browserLanguage: string): Preferences {
  return {
    language: detectLanguage(browserLanguage),
    mode: 'hiragana',
    selectedPairIds: defaultSelection(),
  }
}

export function browserStorage(): PreferenceStorage | undefined {
  try {
    return window.localStorage
  } catch {
    return undefined
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function loadPreferences(
  browserLanguage: string,
  storage: PreferenceStorage | undefined,
): Preferences {
  const defaults = createDefaultPreferences(browserLanguage)
  try {
    const raw =
      storage?.getItem(preferencesKey) ?? storage?.getItem(legacyPreferencesKey)
    if (!raw) return defaults
    const stored: unknown = JSON.parse(raw)
    if (!isRecord(stored) || (stored.version !== 1 && stored.version !== 2))
      return defaults
    const ids =
      stored.version === 1 ? stored.selectedIds : stored.selectedPairIds
    let selectedPairIds = defaults.selectedPairIds
    if (
      Array.isArray(ids) &&
      ids.every((id): id is string => typeof id === 'string')
    ) {
      // Preserve the union of the previous independent selections, including
      // choices in the other script. An explicitly empty selection stays empty.
      const validIds =
        stored.version === 1
          ? ids.flatMap((id) => legacyPairs.get(id) ?? [])
          : ids.filter((id) => kanaPairIds.has(id))
      selectedPairIds = [...new Set(validIds)]
    }
    return {
      language:
        stored.language === 'pt' || stored.language === 'en'
          ? stored.language
          : defaults.language,
      mode:
        stored.mode === 'hiragana' ||
        stored.mode === 'katakana' ||
        stored.mode === 'both'
          ? stored.mode
          : defaults.mode,
      selectedPairIds,
    }
  } catch {
    return defaults
  }
}

export function savePreferences(
  preferences: Preferences,
  storage: PreferenceStorage | undefined,
): boolean {
  if (!storage) return false
  try {
    storage.setItem(
      preferencesKey,
      JSON.stringify({
        version: 2,
        language: preferences.language,
        mode: preferences.mode,
        selectedPairIds: preferences.selectedPairIds,
      }),
    )
    return true
  } catch {
    return false
  }
}
