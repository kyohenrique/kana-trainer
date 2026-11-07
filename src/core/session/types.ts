import type { Kana } from '../kana/catalog'

export interface Occurrence {
  readonly id: string
  readonly kana: Kana
  readonly retryOf: string | null
}

export interface Attempt {
  readonly occurrence: Occurrence
  readonly answer: string
  readonly normalizedAnswer: string
  readonly correct: boolean
  readonly activeTimeMs: number
}

export interface Session {
  readonly id: string
  readonly initialKana: readonly Kana[]
  readonly sequence: readonly Occurrence[]
  readonly attempts: readonly Attempt[]
}

export interface CreateSessionInput {
  // The integration layer supplies a fresh ID for every new session.
  readonly id: string
  readonly kana: readonly Kana[]
  readonly shuffleSamples: readonly number[]
}

export interface AnswerSubmission {
  readonly occurrenceId: string
  readonly answer: string
  // Elapsed active time supplied by the integration layer, excluding pauses.
  readonly activeTimeMs: number
  // Number of remaining occurrences before the retry; required only on error.
  readonly retryIndex?: number
}

export interface KanaResult {
  readonly kana: Kana
  readonly firstAttemptCorrect: boolean | null
  readonly incorrectAttemptCount: number
  readonly attempts: readonly Attempt[]
}

export interface SessionResults {
  readonly initialCount: number
  readonly firstAttemptCorrectCount: number
  readonly firstAttemptCorrectPercent: number
  readonly incorrectAttemptCount: number
  readonly totalActiveTimeMs: number
  readonly kanaResults: readonly KanaResult[]
}
