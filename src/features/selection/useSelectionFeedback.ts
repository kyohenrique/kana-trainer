import { useEffect, useState } from 'react'
import { usePreferences } from '../../shared/preferences/context'
import { planSelectionFeedback, type SelectionFeedback } from './feedbackPlan'
import { SelectionSounds } from './selectionSounds'

export function useSelectionFeedback(paused: boolean) {
  const { preferences, setSelected } = usePreferences()
  const [sounds] = useState(() => new SelectionSounds())
  useEffect(() => {
    if (paused) sounds.stop()
  }, [paused, sounds])
  const [feedback, setFeedback] = useState<SelectionFeedback>({
    revision: 0,
    delays: new Map(),
  })

  useEffect(() => {
    function onVisibilityChange() {
      if (document.hidden) {
        sounds.stop()
        setFeedback((previous) => ({ ...previous, delays: new Map() }))
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      sounds.dispose()
    }
  }, [sounds])

  function cancelFeedback() {
    sounds.stop()
    setFeedback((previous) => ({ ...previous, delays: new Map() }))
  }

  function changeSelection(ids: readonly string[], selected: boolean) {
    const plan = planSelectionFeedback(
      ids,
      preferences.selectedPairIds,
      selected,
    )
    // Persist and expose the actual selection immediately; only its paint is delayed.
    setSelected(ids, selected)
    setFeedback((previous) => ({
      revision: previous.revision + 1,
      delays: plan.delays,
    }))
    sounds.play(selected, plan.soundDelays)
  }

  return { feedback, changeSelection, cancelFeedback }
}
