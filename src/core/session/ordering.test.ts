import { describe, expect, it } from 'vitest'
import { kanaCatalog } from '../kana/catalog'
import { chooseRetryIndex, shuffleKana } from './ordering'

describe('deterministic sequence ordering', () => {
  it('preserves all kana and the input when shuffling with supplied samples', () => {
    const kana = Object.freeze(kanaCatalog.slice(0, 5))
    const before = [...kana]
    const shuffled = shuffleKana(kana, [0, 0, 0, 0])
    expect(shuffled.map((item) => item.glyph)).toEqual([
      'い',
      'う',
      'え',
      'お',
      'あ',
    ])
    expect(kana).toEqual(before)
    expect(shuffled).not.toBe(kana)
    expect(new Set(shuffled)).toEqual(new Set(kana))
    expect(shuffleKana(kana, [0, 0, 0, 0])).toEqual(shuffled)
  })

  it('can reach all six permutations of three items', () => {
    const permutations = new Set<string>()
    for (const first of [0, 1 / 3, 2 / 3]) {
      for (const second of [0, 0.5]) {
        permutations.add(
          shuffleKana(kanaCatalog.slice(0, 3), [first, second])
            .map((kana) => kana.id)
            .join(','),
        )
      }
    }
    expect(permutations.size).toBe(6)
  })

  it('handles empty and single-item input without random samples', () => {
    expect(shuffleKana([], [])).toEqual([])
    expect(shuffleKana(kanaCatalog.slice(0, 1), [])).toEqual(
      kanaCatalog.slice(0, 1),
    )
  })

  it.each([0, 1, 2, 3])(
    'puts the retry last when %i items remain',
    (remaining) => {
      expect(chooseRetryIndex(remaining, 0)).toBe(remaining)
      expect(chooseRetryIndex(remaining, 1 - Number.EPSILON)).toBe(remaining)
    },
  )

  it('includes every allowed retry position, including the end', () => {
    expect(chooseRetryIndex(5, 0)).toBe(3)
    expect(chooseRetryIndex(5, 0.5)).toBe(4)
    expect(chooseRetryIndex(5, 1 - Number.EPSILON)).toBe(5)
    for (let count = 4; count <= 208; count++) {
      expect(chooseRetryIndex(count, 0)).toBe(3)
      expect(chooseRetryIndex(count, 1 - Number.EPSILON)).toBe(count)
    }
  })

  it('rejects missing or extra shuffle samples instead of losing items', () => {
    const kana = kanaCatalog.slice(0, 3)
    expect(() => shuffleKana(kana, [0])).toThrow(RangeError)
    expect(() => shuffleKana(kana, [0, 0, 0])).toThrow(RangeError)
    expect(() => shuffleKana(kana, new Array<number>(2))).toThrow(RangeError)
  })

  it.each([-1, 1, NaN, Infinity])(
    'rejects invalid random sample %s',
    (sample) => {
      expect(() => shuffleKana(kanaCatalog.slice(0, 2), [sample])).toThrow(
        RangeError,
      )
      expect(() => chooseRetryIndex(5, sample)).toThrow(RangeError)
    },
  )

  it.each([-1, 0.5, NaN, Infinity])(
    'rejects invalid remaining count %s',
    (count) => {
      expect(() => chooseRetryIndex(count, 0)).toThrow(RangeError)
    },
  )
})
