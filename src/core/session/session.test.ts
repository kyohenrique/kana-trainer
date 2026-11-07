import { describe, expect, it } from 'vitest'
import {
  kanaCatalog,
  selectedKana,
  type Kana,
  type ScriptMode,
} from '../kana/catalog'
import { chooseRetryIndex } from './ordering'
import { summarizeSession } from './results'
import {
  createSession,
  getCurrentOccurrence,
  isSessionComplete,
  submitAnswer,
} from './session'
import type { Session } from './types'

function start(
  kana: readonly Kana[] = kanaCatalog.slice(0, 6),
  id = 'session-1',
): Session {
  const session = createSession({
    id,
    kana,
    // The upper bound keeps this fixture in catalog order.
    shuffleSamples: Array.from(
      { length: new Set(kana.map((item) => item.id)).size - 1 },
      () => 1 - Number.EPSILON,
    ),
  })
  if (!session) throw new Error('The fixture must contain at least one kana.')
  return session
}

function answer(
  session: Session,
  text: string,
  activeTimeMs = 1000,
  sample = 0,
): Session {
  const current = getCurrentOccurrence(session)!
  return submitAnswer(session, {
    occurrenceId: current.id,
    answer: text,
    activeTimeMs,
    retryIndex: chooseRetryIndex(
      session.sequence.length - session.attempts.length - 1,
      sample,
    ),
  })
}

function freezeSession(session: Session): Session {
  session.sequence.forEach(Object.freeze)
  session.attempts.forEach(Object.freeze)
  Object.freeze(session.initialKana)
  Object.freeze(session.sequence)
  Object.freeze(session.attempts)
  return Object.freeze(session)
}

describe('session creation', () => {
  it.each<ScriptMode>(['hiragana', 'katakana', 'both'])(
    'expands the selected pairs exactly once for %s',
    (mode) => {
      const selection = ['kana:あ', 'kana:じ', 'kana:ぢ', 'kana:きゃ']
      const kana = selectedKana(selection, mode)
      const session = start(kana)
      expect(session.initialKana).toHaveLength(mode === 'both' ? 8 : 4)
      expect(session.sequence.map((occurrence) => occurrence.kana)).toEqual(
        kana,
      )
      expect(new Set(session.sequence.map((item) => item.id)).size).toBe(
        kana.length,
      )
      expect(session.sequence.every((item) => item.retryOf === null)).toBe(true)
      selection.length = 0
      expect(session.initialKana).toHaveLength(mode === 'both' ? 8 : 4)
    },
  )

  it('cannot start a session from an empty selection', () => {
    expect(
      createSession({ id: 'empty', kana: [], shuffleSamples: [] }),
    ).toBeNull()
  })

  it('snapshots and deduplicates the initial kana by ID, not reading', () => {
    const kana = [...selectedKana(['kana:じ', 'kana:ぢ'], 'both')]
    kana.push(kana[0]!)
    const session = start(kana)
    kana.length = 0
    expect(session.initialKana.map((item) => item.glyph)).toEqual([
      'じ',
      'ぢ',
      'ジ',
      'ヂ',
    ])
    expect(session.sequence).toHaveLength(4)
  })

  it('uses the supplied shuffle samples when building the initial sequence', () => {
    const kana = kanaCatalog.slice(0, 3)
    const session = createSession({
      id: 'shuffled',
      kana,
      shuffleSamples: [0, 0],
    })!
    expect(session.initialKana).toEqual(kana)
    expect(session.sequence.map((item) => item.kana.glyph)).toEqual([
      'い',
      'う',
      'あ',
    ])
  })

  it('requires a session identity for correlating later feedback', () => {
    expect(() => start(undefined, ' ')).toThrow(RangeError)
  })
})

describe('answer transitions', () => {
  it('preserves the submitted text, accepted variant and canonical feedback', () => {
    const session = start(selectedKana(['kana:し'], 'hiragana'))
    const next = answer(session, ' SI ', 1234.5)
    expect(next.attempts[0]).toEqual({
      occurrence: session.sequence[0],
      answer: ' SI ',
      normalizedAnswer: 'si',
      correct: true,
      activeTimeMs: 1234.5,
    })
    expect(next.attempts[0]!.occurrence.kana.reading).toBe('shi')
    expect(isSessionComplete(next)).toBe(true)
  })

  it.each(['', '  ', '\n\t'])(
    'leaves the current occurrence and attempts untouched for empty answer %j',
    (text) => {
      const session = freezeSession(start())
      expect(answer(session, text, 5000)).toBe(session)
      expect(getCurrentOccurrence(session)?.kana.glyph).toBe('あ')
      expect(session.attempts).toEqual([])
    },
  )

  it.each([0, 0.5, 1 - Number.EPSILON])(
    'inserts a single retry at the supplied allowed position (sample %s)',
    (sample) => {
      const session = freezeSession(start())
      const next = answer(session, 'wrong', 1200, sample)
      const retryIndex = next.sequence.findIndex(
        (item) => item.retryOf !== null,
      )
      expect(retryIndex).toBe(1 + chooseRetryIndex(5, sample))
      expect(next.sequence[retryIndex]).toEqual({
        id: 'session-1:6',
        kana: session.sequence[0]!.kana,
        retryOf: session.sequence[0]!.id,
      })
      expect(next.sequence.filter((item) => item.retryOf === null)).toEqual(
        session.sequence,
      )
      expect(getCurrentOccurrence(next)?.kana.glyph).toBe('い')
      expect(next.attempts[0]!.correct).toBe(false)
      expect(session.attempts).toHaveLength(0)
    },
  )

  it.each([0, 1, 2, 3])(
    'appends a retry near the end with %i remaining',
    (remaining) => {
      const session = start(kanaCatalog.slice(0, remaining + 1))
      const next = answer(session, 'wrong')
      expect(next.sequence.at(-1)?.retryOf).toBe(session.sequence[0]!.id)
      expect(next.sequence).toHaveLength(session.sequence.length + 1)
      expect(isSessionComplete(next)).toBe(false)
    },
  )

  it('keeps retrying a lone kana until correct without overwriting previous errors', () => {
    let session = start(kanaCatalog.slice(0, 1))
    const first = session.sequence[0]!
    session = answer(session, 'wrong', 4200)
    const second = getCurrentOccurrence(session)!
    session = answer(session, 'wrong again', 1800)
    const third = getCurrentOccurrence(session)!
    expect([first.id, second.id, third.id]).toEqual([
      'session-1:0',
      'session-1:1',
      'session-1:2',
    ])
    expect(second.retryOf).toBe(first.id)
    expect(third.retryOf).toBe(second.id)
    session = answer(session, 'a', 900)
    expect(session.attempts.map((attempt) => attempt.correct)).toEqual([
      false,
      false,
      true,
    ])
    expect(getCurrentOccurrence(session)).toBeUndefined()
    expect(isSessionComplete(session)).toBe(true)
    expect(session.initialKana).toHaveLength(1)
  })

  it('ignores duplicate, stale, and post-completion submissions', () => {
    const original = start(kanaCatalog.slice(0, 2))
    const submission = {
      occurrenceId: original.sequence[0]!.id,
      answer: 'a',
      activeTimeMs: 500,
    }
    const next = submitAnswer(original, submission)
    expect(submitAnswer(next, submission)).toBe(next)
    const restarted = start(original.initialKana, 'session-2')
    expect(submitAnswer(restarted, submission)).toBe(restarted)
    const finished = answer(next, 'i')
    expect(submitAnswer(finished, submission)).toBe(finished)
    expect(finished.attempts).toHaveLength(2)
  })

  it('replays deterministically without mutating prior states', () => {
    const original = freezeSession(start())
    const first = answer(original, 'wrong', 1100)
    const second = answer(original, 'wrong', 1100)
    expect(first).toEqual(second)
    const snapshot = structuredClone(first)
    answer(freezeSession(first), 'i', 300)
    expect(first).toEqual(snapshot)
  })

  it.each([-1, NaN, Infinity, -Infinity])(
    'rejects invalid active time %s',
    (time) => {
      const session = freezeSession(start())
      expect(() => answer(session, 'a', time)).toThrow(RangeError)
      expect(session.attempts).toEqual([])
    },
  )

  it.each([undefined, -1, 0, 2, 6, 3.5, NaN, Infinity])(
    'rejects an invalid retry index %s without recording a partial attempt',
    (retryIndex) => {
      const session = freezeSession(start())
      expect(() =>
        submitAnswer(session, {
          occurrenceId: session.sequence[0]!.id,
          answer: 'wrong',
          activeTimeMs: 10,
          ...(retryIndex === undefined ? {} : { retryIndex }),
        }),
      ).toThrow(RangeError)
      expect(session.attempts).toEqual([])
    },
  )
})

describe('results derived from attempts', () => {
  it('retains chronological attempts and first-attempt accuracy after multiple retries', () => {
    let session = start(kanaCatalog.slice(0, 4))
    for (const [glyph, text, time] of [
      ['あ', 'wrong', 1000],
      ['い', 'i', 0],
      ['う', 'wrong', 2000],
      ['え', 'e', 1500],
      ['あ', 'wrong again', 500],
      ['う', 'u', 800],
      ['あ', 'a', 700],
    ] as const) {
      expect(getCurrentOccurrence(session)?.kana.glyph).toBe(glyph)
      session = answer(session, text, time)
    }
    expect(isSessionComplete(session)).toBe(true)
    const results = summarizeSession(freezeSession(session))
    expect(results).toMatchObject({
      initialCount: 4,
      firstAttemptCorrectCount: 2,
      firstAttemptCorrectPercent: 50,
      incorrectAttemptCount: 3,
      totalActiveTimeMs: 6500,
    })
    const a = results.kanaResults.find((result) => result.kana.glyph === 'あ')!
    expect(a.firstAttemptCorrect).toBe(false)
    expect(a.incorrectAttemptCount).toBe(2)
    expect(
      a.attempts.map((attempt) => [attempt.activeTimeMs, attempt.correct]),
    ).toEqual([
      [1000, false],
      [500, false],
      [700, true],
    ])
    expect(
      results.kanaResults
        .filter((result) => result.incorrectAttemptCount > 0)
        .map((result) => result.kana.glyph),
    ).toEqual(['あ', 'う'])
    expect(
      results.kanaResults.find((result) => result.kana.glyph === 'い')
        ?.firstAttemptCorrect,
    ).toBe(true)
  })

  it('keeps same-reading kana and writing systems separate in the summary', () => {
    let session = start(selectedKana(['kana:じ', 'kana:ぢ'], 'both'))
    session = answer(session, 'wrong', 100)
    while (!isSessionComplete(session)) session = answer(session, 'ji', 200)
    const results = summarizeSession(session)
    expect(results.initialCount).toBe(4)
    expect(results.firstAttemptCorrectPercent).toBe(75)
    expect(
      results.kanaResults.map((result) => [
        result.kana.glyph,
        result.incorrectAttemptCount,
      ]),
    ).toEqual([
      ['じ', 1],
      ['ぢ', 0],
      ['ジ', 0],
      ['ヂ', 0],
    ])
    expect(results.totalActiveTimeMs).toBe(900)
  })

  it('distinguishes unanswered kana from errors and only sums recorded active time', () => {
    let session = start(kanaCatalog.slice(0, 3))
    expect(summarizeSession(session)).toMatchObject({
      firstAttemptCorrectCount: 0,
      incorrectAttemptCount: 0,
      totalActiveTimeMs: 0,
    })
    session = answer(session, ' ', 5000)
    session = answer(session, 'a', 1250.5)
    const results = summarizeSession(session)
    expect(results.totalActiveTimeMs).toBe(1250.5)
    expect(results.firstAttemptCorrectPercent).toBeCloseTo(100 / 3)
    expect(
      results.kanaResults.map((result) => result.firstAttemptCorrect),
    ).toEqual([true, null, null])
  })

  it('finishes a full mixed-script session with each selected kana answered once', () => {
    let session = start(kanaCatalog)
    for (const kana of session.initialKana)
      session = answer(session, kana.reading, 10)
    expect(isSessionComplete(session)).toBe(true)
    expect(session.sequence).toHaveLength(208)
    expect(session.attempts).toHaveLength(208)
    expect(summarizeSession(session)).toMatchObject({
      initialCount: 208,
      firstAttemptCorrectCount: 208,
      firstAttemptCorrectPercent: 100,
      incorrectAttemptCount: 0,
      totalActiveTimeMs: 2080,
    })
  })
})
