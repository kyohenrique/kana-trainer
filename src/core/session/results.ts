import type { Attempt, KanaResult, Session, SessionResults } from './types'

export function summarizeSession(session: Session): SessionResults {
  const attemptsByKana = new Map<string, Attempt[]>()
  for (const attempt of session.attempts) {
    const id = attempt.occurrence.kana.id
    const attempts = attemptsByKana.get(id) ?? []
    attempts.push(attempt)
    attemptsByKana.set(id, attempts)
  }
  const kanaResults: KanaResult[] = session.initialKana.map((kana) => {
    const attempts = attemptsByKana.get(kana.id) ?? []
    return {
      kana,
      firstAttemptCorrect: attempts[0]?.correct ?? null,
      incorrectAttemptCount: attempts.filter((attempt) => !attempt.correct)
        .length,
      attempts,
    }
  })
  const firstAttemptCorrectCount = kanaResults.filter(
    (result) => result.firstAttemptCorrect === true,
  ).length
  const initialCount = session.initialKana.length
  return {
    initialCount,
    firstAttemptCorrectCount,
    firstAttemptCorrectPercent:
      initialCount === 0 ? 0 : (firstAttemptCorrectCount / initialCount) * 100,
    incorrectAttemptCount: session.attempts.filter(
      (attempt) => !attempt.correct,
    ).length,
    totalActiveTimeMs: session.attempts.reduce(
      (total, attempt) => total + attempt.activeTimeMs,
      0,
    ),
    kanaResults,
  }
}
