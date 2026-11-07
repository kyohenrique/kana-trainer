import { describe, expect, it } from 'vitest'
import { kanaCatalog } from '../kana/catalog'
import { evaluateAnswer } from './answers'

const shi = kanaCatalog.find((kana) => kana.id === 'hiragana:し')!

describe('romaji answers', () => {
  it('accepts every explicitly registered reading in both scripts', () => {
    for (const kana of kanaCatalog) {
      for (const reading of kana.acceptedReadings) {
        expect(evaluateAnswer(kana, ` \t${reading.toUpperCase()}\n`)).toEqual({
          normalizedAnswer: reading,
          correct: true,
        })
      }
    }
  })

  it('keeps the canonical reading when an alternative is accepted', () => {
    expect(evaluateAnswer(shi, ' SI ')).toEqual({
      normalizedAnswer: 'si',
      correct: true,
    })
    expect(shi.reading).toBe('shi')
  })

  it.each(['', ' ', '\t\n'])(
    'does not evaluate an empty answer: %j',
    (answer) => {
      expect(evaluateAnswer(shi, answer)).toBeNull()
    },
  )

  it.each(['sh i', 'sh-i', 'し', 'ｓｈｉ', 'shí', 'shi!', 'chi'])(
    'does not silently turn an unregistered answer into a match: %s',
    (answer) => {
      expect(evaluateAnswer(shi, answer)?.correct).toBe(false)
    },
  )

  it('only accepts variants belonging to the presented kana', () => {
    const ji = kanaCatalog.find((kana) => kana.id === 'hiragana:じ')!
    const di = kanaCatalog.find((kana) => kana.id === 'hiragana:ぢ')!
    expect(evaluateAnswer(ji, 'di')?.correct).toBe(false)
    expect(evaluateAnswer(di, 'di')?.correct).toBe(true)
    expect(evaluateAnswer(ji, 'ji')?.correct).toBe(true)
    expect(evaluateAnswer(di, 'ji')?.correct).toBe(true)
  })
})
