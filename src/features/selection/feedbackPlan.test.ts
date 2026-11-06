import { describe, expect, it } from 'vitest'
import { defaultSelection } from '../../core/kana/catalog'
import { planSelectionFeedback, selectionTransitionMs } from './feedbackPlan'

describe('selection feedback', () => {
  const basics = defaultSelection()

  it.each([1, 2, 5, 10])(
    'only fills the %i missing pairs, in chart order',
    (count) => {
      const missing = basics.slice(0, count)
      const plan = planSelectionFeedback(
        [...basics].reverse(),
        basics.slice(count),
        true,
      )
      expect([...plan.delays.keys()]).toEqual(missing)
      expect(plan.soundDelays.length).toBeGreaterThan(0)
      expect(plan.soundDelays.length).toBeLessThanOrEqual(count)
      if (count === 1) expect(plan.soundDelays).toEqual([0])
    },
  )

  it('ignores unchanged, duplicate and unknown pairs', () => {
    expect(planSelectionFeedback(basics, basics, true).soundDelays).toEqual([])
    const plan = planSelectionFeedback(
      ['kana:あ', 'kana:あ', 'unknown'],
      basics,
      false,
    )
    expect([...plan.delays.keys()]).toEqual(['kana:あ'])
    expect(plan.soundDelays).toEqual([0])
  })

  it('keeps large cascades within 400 ms and limits simultaneous sound', () => {
    const plan = planSelectionFeedback(basics, basics, false)
    const delays = [...plan.delays.values()]
    expect(delays).toHaveLength(46)
    expect(delays[0]).toBe(0)
    expect(Math.max(...delays) + selectionTransitionMs).toBeLessThanOrEqual(400)
    expect(plan.soundDelays.length).toBeLessThanOrEqual(7)
    for (let index = 1; index < plan.soundDelays.length; index++) {
      expect(
        plan.soundDelays[index]! - plan.soundDelays[index - 1]!,
      ).toBeGreaterThanOrEqual(45)
    }
  })
})
