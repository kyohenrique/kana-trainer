import { createContext, useContext } from 'react'
import type { Kana } from '../../core/kana/catalog'
import type { AnswerSubmission, Session } from '../../core/session/types'
export interface TrainingContextValue {
  session: Session | null
  start: (kana: readonly Kana[]) => void
  answer: (submission: AnswerSubmission) => void
  clear: () => void
}
export const TrainingContext = createContext<TrainingContextValue | null>(null)
export function useTraining() {
  const value = useContext(TrainingContext)
  if (!value) throw new Error('Missing TrainingProvider')
  return value
}
