import {
  defaultSelection,
  kanaCatalog,
  kanaPairIds,
  type ScriptMode,
} from '../../core/kana/catalog'

export type Language = 'pt' | 'en'
export type Voice = 'female' | 'male'
export interface Preferences {
  effectsVolume: number
  pronunciationVolume: number
  voice: Voice
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
    effectsVolume: 0.75,
    pronunciationVolume: 0.8,
    voice: 'female',
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

function readVolume(value: unknown, fallback: number): number {
  return typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 1
    ? value
    : fallback
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
      effectsVolume: readVolume(stored.effectsVolume, defaults.effectsVolume),
      pronunciationVolume: readVolume(
        stored.pronunciationVolume,
        defaults.pronunciationVolume,
      ),
      voice: stored.voice === 'male' ? 'male' : 'female',
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
        voice: preferences.voice,
        effectsVolume: preferences.effectsVolume,
        pronunciationVolume: preferences.pronunciationVolume,
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
