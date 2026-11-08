import { useReducer, type ReactNode } from 'react'
import { createSession, submitAnswer } from '../../core/session/session'
import type { AnswerSubmission, Session } from '../../core/session/types'
import { TrainingContext } from './context'
type Action =
  | { type: 'start'; session: Session | null }
  | { type: 'answer'; submission: AnswerSubmission }
function reducer(state: Session | null, action: Action) {
  if (action.type === 'start') return action.session
  return state ? submitAnswer(state, action.submission) : state
}
export function TrainingProvider({ children }: { children: ReactNode }) {
  const [session, dispatch] = useReducer(reducer, null)
  return (
    <TrainingContext
      value={{
        session,
        start(kana) {
          dispatch({
            type: 'start',
            session: createSession({
              id: crypto.randomUUID(),
              kana,
              shuffleSamples: Array.from(
                { length: Math.max(0, kana.length - 1) },
                () => Math.random(),
              ),
            }),
          })
        },
        answer(submission) {
          dispatch({ type: 'answer', submission })
        },
        clear() {
          dispatch({ type: 'start', session: null })
        },
      }}
    >
      {children}
    </TrainingContext>
  )
}
