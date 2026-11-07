import type { Kana } from '../kana/catalog'

interface AnswerEvaluation {
  readonly normalizedAnswer: string
  readonly correct: boolean
}

export function evaluateAnswer(
  kana: Kana,
  answer: string,
): AnswerEvaluation | null {
  const normalizedAnswer = answer.trim().toLowerCase()
  if (normalizedAnswer.length === 0) return null
  return {
    normalizedAnswer,
    correct: kana.acceptedReadings.includes(normalizedAnswer),
  }
}
