import { evaluateAnswer } from './answers'
import { minimumRetryGap, shuffleKana } from './ordering'
import type {
  AnswerSubmission,
  Attempt,
  CreateSessionInput,
  Occurrence,
  Session,
} from './types'

export function createSession(input: CreateSessionInput): Session | null {
  const initialKana = [
    ...new Map(input.kana.map((kana) => [kana.id, kana])).values(),
  ]
  if (initialKana.length === 0) return null
  if (input.id.trim().length === 0)
    throw new RangeError('A session needs a non-empty ID.')
  const ordered = shuffleKana(initialKana, input.shuffleSamples)
  return {
    id: input.id,
    initialKana,
    sequence: ordered.map((kana, index) => ({
      id: `${input.id}:${index}`,
      kana,
      retryOf: null,
    })),
    attempts: [],
  }
}

export function getCurrentOccurrence(session: Session): Occurrence | undefined {
  // Every accepted submission consumes exactly one occurrence.
  return session.sequence[session.attempts.length]
}

export function isSessionComplete(session: Session): boolean {
  return getCurrentOccurrence(session) === undefined
}

export function submitAnswer(
  session: Session,
  submission: AnswerSubmission,
): Session {
  const current = getCurrentOccurrence(session)
  // Ignore duplicate submissions and events belonging to an older session.
  if (!current || submission.occurrenceId !== current.id) return session
  const evaluation = evaluateAnswer(current.kana, submission.answer)
  if (!evaluation) return session
  if (!Number.isFinite(submission.activeTimeMs) || submission.activeTimeMs < 0)
    throw new RangeError('Active time must be finite and non-negative.')

  let sequence = session.sequence
  if (!evaluation.correct) {
    const nextIndex = session.attempts.length + 1
    const remainingCount = sequence.length - nextIndex
    const { retryIndex } = submission
    if (
      retryIndex === undefined ||
      !Number.isSafeInteger(retryIndex) ||
      retryIndex < Math.min(minimumRetryGap, remainingCount) ||
      retryIndex > remainingCount
    )
      throw new RangeError(
        'Retry index must respect the remaining sequence and gap.',
      )
    const retry: Occurrence = {
      id: `${session.id}:${sequence.length}`,
      kana: current.kana,
      retryOf: current.id,
    }
    sequence = [
      ...sequence.slice(0, nextIndex + retryIndex),
      retry,
      ...sequence.slice(nextIndex + retryIndex),
    ]
  }

  const attempt: Attempt = {
    occurrence: current,
    answer: submission.answer,
    ...evaluation,
    activeTimeMs: submission.activeTimeMs,
  }
  return {
    ...session,
    sequence,
    attempts: [...session.attempts, attempt],
  }
}
