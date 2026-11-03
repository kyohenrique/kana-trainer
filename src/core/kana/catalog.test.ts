import { describe, expect, it } from 'vitest'
import {
  defaultSelection,
  kanaCatalog,
  kanaIds,
  kanaPairIds,
  kanaPairs,
  kanaRows,
  selectedKana,
} from './catalog'

describe('modern kana catalog', () => {
  it('contains distinct identifiers for 104 items in each writing system', () => {
    expect(kanaCatalog).toHaveLength(208)
    expect(kanaIds.size).toBe(kanaCatalog.length)
    for (const script of ['hiragana', 'katakana']) {
      expect(
        kanaCatalog.filter(
          (kana) => kana.script === script && kana.category === 'basic',
        ),
      ).toHaveLength(46)
      expect(
        kanaCatalog.filter(
          (kana) => kana.script === script && kana.category === 'marks',
        ),
      ).toHaveLength(25)
      expect(
        kanaCatalog.filter(
          (kana) => kana.script === script && kana.category === 'combinations',
        ),
      ).toHaveLength(33)
    }
  })

  it('preserves irregular readings and small kana as complete items', () => {
    expect(kanaCatalog.find((kana) => kana.id === 'hiragana:し')).toMatchObject(
      { reading: 'shi', acceptedReadings: ['shi', 'si'] },
    )
    expect(kanaCatalog.find((kana) => kana.id === 'katakana:チ')).toMatchObject(
      { reading: 'chi', acceptedReadings: ['chi', 'ti'] },
    )
    expect(
      kanaCatalog.find((kana) => kana.id === 'katakana:ピョ'),
    ).toMatchObject({ reading: 'pyo', glyph: 'ピョ' })
    expect(kanaCatalog.find((kana) => kana.id === 'hiragana:ぢ')?.id).not.toBe(
      kanaCatalog.find((kana) => kana.id === 'hiragana:じ')?.id,
    )
    expect(
      kanaCatalog.every((kana) => kana.acceptedReadings.includes(kana.reading)),
    ).toBe(true)
  })

  it('starts with 46 basic pairs and preserves gaps in the chart', () => {
    const initial = defaultSelection()
    expect(initial).toHaveLength(46)
    expect(initial).toContain('kana:ん')
    expect(initial).not.toContain('kana:が')
    expect(selectedKana(initial, 'hiragana')).toHaveLength(46)
    expect(selectedKana(initial, 'katakana')).toHaveLength(46)
    expect(selectedKana(initial, 'both')).toHaveLength(92)
    expect(
      kanaRows
        .find((row) => row.id === 'hiragana:y')
        ?.slots.map((kana) => kana?.glyph ?? null),
    ).toEqual(['や', null, 'ゆ', null, 'よ'])
  })

  it('pairs corresponding characters without merging equal readings', () => {
    expect(kanaPairs).toHaveLength(104)
    expect(kanaPairIds.size).toBe(104)
    const selected = selectedKana(['kana:じ', 'kana:ぢ', 'kana:きゃ'], 'both')
    expect(selected.map((kana) => kana.glyph)).toEqual([
      'じ',
      'ぢ',
      'きゃ',
      'ジ',
      'ヂ',
      'キャ',
    ])
    expect(new Set(selected.map((kana) => kana.id)).size).toBe(6)
    expect(selectedKana([], 'both')).toEqual([])
    expect(
      selectedKana(['kana:あ', 'kana:あ', 'obsolete'], 'both').map(
        (kana) => kana.glyph,
      ),
    ).toEqual(['あ', 'ア'])
  })
})
