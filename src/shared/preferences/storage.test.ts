import { describe, expect, it } from 'vitest'
import {
  createDefaultPreferences,
  detectLanguage,
  loadPreferences,
  preferencesKey,
  savePreferences,
  type PreferenceStorage,
} from './storage'

describe('language and preferences', () => {
  it('remembers voice and both volumes, including silence, without saving session state', () => {
    const preferences = {
      ...createDefaultPreferences('pt'),
      voice: 'male' as const,
      effectsVolume: 0,
      pronunciationVolume: 0.35,
    }
    savePreferences(preferences, localStorage)
    expect(loadPreferences('en', localStorage)).toEqual(preferences)
  })
  it.each([-1, 2, 'loud', null])(
    'uses defaults for invalid saved volume %s',
    (value) => {
      localStorage.setItem(
        preferencesKey,
        JSON.stringify({
          version: 2,
          effectsVolume: value,
          pronunciationVolume: value,
        }),
      )
      expect(loadPreferences('pt', localStorage)).toMatchObject({
        effectsVolume: 0.75,
        pronunciationVolume: 0.8,
      })
    },
  )
  it.each([
    ['pt-BR', 'pt'],
    ['pt-PT', 'pt'],
    ['PT-br', 'pt'],
    ['pt', 'pt'],
    ['en-US', 'en'],
    ['ja', 'en'],
    ['fr-FR', 'en'],
  ])('detects %s as %s', (language, expected) => {
    expect(detectLanguage(language)).toBe(expected)
  })

  it('gives the saved language precedence and keeps an intentionally empty selection', () => {
    const preferences = {
      ...createDefaultPreferences('pt-BR'),
      language: 'en' as const,
      mode: 'both' as const,
      selectedPairIds: [],
    }
    expect(savePreferences(preferences, localStorage)).toBe(true)
    expect(loadPreferences('pt-PT', localStorage)).toEqual(preferences)
    expect(
      Object.keys(JSON.parse(localStorage.getItem(preferencesKey) ?? '{}')),
    ).toEqual([
      'version',
      'voice',
      'effectsVolume',
      'pronunciationVolume',
      'language',
      'mode',
      'selectedPairIds',
    ])
  })

  it('removes obsolete and duplicate identifiers without dropping valid choices', () => {
    localStorage.setItem(
      preferencesKey,
      JSON.stringify({
        version: 2,
        language: 'pt',
        mode: 'katakana',
        selectedPairIds: ['kana:あ', 'kana:ぴょ', 'old-id', 'kana:あ'],
      }),
    )
    expect(loadPreferences('en', localStorage).selectedPairIds).toEqual([
      'kana:あ',
      'kana:ぴょ',
    ])
  })

  it.each([
    'broken JSON',
    'null',
    '[]',
    '{"version":99}',
    '{"version":2,"selectedPairIds":[42],"language":false,"mode":null}',
  ])('recovers safely from invalid preferences: %s', (raw) => {
    localStorage.setItem(preferencesKey, raw)
    expect(loadPreferences('pt-BR', localStorage)).toEqual(
      createDefaultPreferences('pt-BR'),
    )
  })

  it('continues in memory when browser storage is unavailable', () => {
    const denied: PreferenceStorage = {
      getItem() {
        throw new Error('denied')
      },
      setItem() {
        throw new Error('quota')
      },
    }
    expect(loadPreferences('en', denied)).toEqual(
      createDefaultPreferences('en'),
    )
    expect(savePreferences(createDefaultPreferences('en'), denied)).toBe(false)
    expect(savePreferences(createDefaultPreferences('en'), undefined)).toBe(
      false,
    )
  })

  it('migrates the union of old script selections and saves the shared format', () => {
    localStorage.setItem(
      'kana-trainer:preferences:v1',
      JSON.stringify({
        version: 1,
        language: 'en',
        mode: 'katakana',
        selectedIds: [
          'hiragana:し',
          'katakana:シ',
          'hiragana:ぢ',
          'katakana:ピョ',
          'old-id',
        ],
      }),
    )
    const migrated = loadPreferences('pt-BR', localStorage)
    expect(migrated).toEqual({
      voice: 'female',
      effectsVolume: 0.75,
      pronunciationVolume: 0.8,
      language: 'en',
      mode: 'katakana',
      selectedPairIds: ['kana:し', 'kana:ぢ', 'kana:ぴょ'],
    })
    expect(savePreferences(migrated, localStorage)).toBe(true)
    expect(loadPreferences('pt-BR', localStorage)).toEqual(migrated)
    expect(
      JSON.parse(localStorage.getItem(preferencesKey) ?? '{}').version,
    ).toBe(2)
  })

  it('preserves empty legacy choices and never revives them after a new selection is saved', () => {
    localStorage.setItem(
      'kana-trainer:preferences:v1',
      JSON.stringify({
        version: 1,
        language: 'pt',
        mode: 'both',
        selectedIds: [],
      }),
    )
    const empty = loadPreferences('en', localStorage)
    expect(empty.selectedPairIds).toEqual([])
    savePreferences(empty, localStorage)
    localStorage.setItem(
      'kana-trainer:preferences:v1',
      JSON.stringify({
        version: 1,
        selectedIds: ['hiragana:あ'],
      }),
    )
    expect(loadPreferences('en', localStorage)).toEqual(empty)
  })
})
