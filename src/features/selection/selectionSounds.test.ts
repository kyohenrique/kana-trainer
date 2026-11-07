import { afterEach, describe, expect, it, vi } from 'vitest'
import { SelectionSounds } from './selectionSounds'

function audioFixture(supportsHold = true) {
  const parameter = () => ({
    value: 1,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    cancelScheduledValues: vi.fn(),
    cancelAndHoldAtTime: supportsHold ? vi.fn() : undefined,
    setTargetAtTime: vi.fn(),
  })
  const context = {
    state: 'running',
    currentTime: 1,
    destination: {},
    resume: vi.fn((): Promise<void> => Promise.resolve()),
    close: vi.fn(() => Promise.resolve()),
    createOscillator: vi.fn(() => ({
      type: '',
      frequency: parameter(),
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null as (() => void) | null,
    })),
    createGain: vi.fn(() => ({
      gain: parameter(),
      connect: vi.fn(),
      disconnect: vi.fn(),
    })),
  }
  const constructor = vi.fn(function () {
    return context
  })
  vi.stubGlobal('AudioContext', constructor)
  return { context, constructor }
}

afterEach(() => vi.unstubAllGlobals())

describe('selection audio lifecycle', () => {
  it('is lazy, distinguishes the two actions and stops pending taps on the next action', async () => {
    const { context, constructor } = audioFixture()
    const sounds = new SelectionSounds()
    expect(constructor).not.toHaveBeenCalled()
    sounds.play(true, [0, 100, 200])
    await Promise.resolve()
    const previous = context.createOscillator.mock.results.map(
      (result) => result.value,
    )
    expect(previous).toHaveLength(9)
    const onPitch = previous[0]!.frequency.setValueAtTime.mock
      .calls[0]![0] as number
    context.currentTime = 1.01
    sounds.play(false, [0])
    await Promise.resolve()
    for (const oscillator of previous.slice(0, 3))
      expect(oscillator.stop).toHaveBeenLastCalledWith(1.022)
    for (const oscillator of previous.slice(3))
      expect(oscillator.stop).toHaveBeenLastCalledWith(1.01)
    for (const [index, gain] of context.createGain.mock.results.entries())
      expect(gain.value.gain.value).toBe(index % 2 === 0 ? 0 : 1)
    const off = context.createOscillator.mock.results[9]!.value
    expect(off.frequency.setValueAtTime.mock.calls[0]![0]).toBeLessThan(onPitch)
    sounds.dispose()
    expect(context.close).toHaveBeenCalledOnce()
  })

  it.each([true, false])(
    'cancels the fifth tap before it can start during release (native hold: %s)',
    async (supportsHold) => {
      const { context } = audioFixture(supportsHold)
      vi.spyOn(performance, 'now').mockReturnValue(0)
      const sounds = new SelectionSounds()
      sounds.play(true, [0, 45, 90, 135, 180])
      await Promise.resolve()
      context.currentTime = 1.175
      sounds.stop()
      for (const result of context.createOscillator.mock.results.slice(12)) {
        expect(result.value.start).toHaveBeenCalledWith(1.18)
        expect(result.value.stop).toHaveBeenLastCalledWith(1.175)
      }
      for (const result of context.createGain.mock.results
        .filter((_, index) => index % 2 === 0)
        .slice(12)) {
        expect(result.value.gain.setValueAtTime).toHaveBeenLastCalledWith(
          0,
          1.175,
        )
        expect(result.value.gain.setTargetAtTime).not.toHaveBeenCalled()
      }
    },
  )

  it('fades active voices separately without rewriting their envelopes', async () => {
    const { context } = audioFixture()
    const sounds = new SelectionSounds()
    sounds.play(true, [0])
    await Promise.resolve()
    context.currentTime = 1.01
    sounds.stop()
    for (const [index, result] of context.createGain.mock.results.entries()) {
      const parameter = result.value.gain
      expect(parameter.cancelAndHoldAtTime).not.toHaveBeenCalled()
      expect(parameter.cancelScheduledValues).not.toHaveBeenCalled()
      if (index % 2 === 0) {
        expect(parameter.setValueAtTime).toHaveBeenCalledExactlyOnceWith(0, 1)
        expect(parameter.exponentialRampToValueAtTime).toHaveBeenCalledOnce()
      } else {
        expect(parameter.setValueAtTime).toHaveBeenCalledExactlyOnceWith(
          1,
          1.01,
        )
        expect(parameter.linearRampToValueAtTime).toHaveBeenLastCalledWith(
          0,
          1.022,
        )
      }
    }
  })

  it.each([0.00075, 0.01, 0.066])(
    'preserves the envelope when cancelled at %s seconds without native hold',
    async (elapsed) => {
      const { context } = audioFixture(false)
      const sounds = new SelectionSounds()
      sounds.play(true, [0])
      await Promise.resolve()
      context.currentTime = 1 + elapsed
      sounds.stop()
      const parameter = context.createGain.mock.results[0]!.value.gain
      expect(parameter.cancelScheduledValues).not.toHaveBeenCalled()
      expect(parameter.setValueAtTime).toHaveBeenCalledExactlyOnceWith(0, 1)
      expect(parameter.linearRampToValueAtTime).toHaveBeenCalledExactlyOnceWith(
        0.065,
        1.0015,
      )
      expect(
        parameter.exponentialRampToValueAtTime,
      ).toHaveBeenCalledExactlyOnceWith(0.0001, 1.065)
      const output = context.createGain.mock.results[1]!.value.gain
      expect(output.setValueAtTime).toHaveBeenCalledExactlyOnceWith(
        1,
        context.currentTime,
      )
      const release = output.linearRampToValueAtTime.mock.calls.at(-1)!
      expect(release[0]).toBe(0)
      expect(release[1]).toBeCloseTo(Math.min(1.07, 1 + elapsed + 0.012), 10)
    },
  )

  it('never prolongs finished or nearly finished voices', async () => {
    const { context } = audioFixture()
    const sounds = new SelectionSounds()
    sounds.play(true, [0])
    await Promise.resolve()
    context.currentTime = 1.066
    sounds.stop()
    const voices = context.createOscillator.mock.results.map((r) => r.value)
    expect(voices[0]!.stop).toHaveBeenCalledTimes(2)
    expect(voices[0]!.stop.mock.calls.at(-1)![0]).toBeCloseTo(1.07, 10)
    for (const voice of voices.slice(1))
      expect(voice.stop).toHaveBeenCalledTimes(1)
  })

  it('does not restart a release on subsequent rapid clicks', async () => {
    const { context } = audioFixture()
    const sounds = new SelectionSounds()
    sounds.play(true, [0, 45, 90])
    await Promise.resolve()
    const first = context.createGain.mock.results[1]!.value.gain
    context.currentTime = 1.01
    sounds.play(false, [0, 45, 90])
    await Promise.resolve()
    context.currentTime = 1.015
    sounds.play(true, [0, 45, 90])
    await Promise.resolve()
    expect(first.setValueAtTime).toHaveBeenCalledExactlyOnceWith(1, 1.01)
    expect(first.linearRampToValueAtTime).toHaveBeenLastCalledWith(0, 1.022)
  })

  it('disconnects the oscillator and both gain nodes after a cancelled voice ends', async () => {
    const { context } = audioFixture()
    const sounds = new SelectionSounds()
    sounds.play(true, [0])
    await Promise.resolve()
    context.currentTime = 1.01
    sounds.stop()
    const first = context.createOscillator.mock.results[0]!.value
    first.onended?.()
    expect(first.disconnect).toHaveBeenCalledOnce()
    expect(
      context.createGain.mock.results[0]!.value.disconnect,
    ).toHaveBeenCalledOnce()
    expect(
      context.createGain.mock.results[1]!.value.disconnect,
    ).toHaveBeenCalledOnce()
  })

  it('never replays a stale request when the browser resumes audio later', async () => {
    const { context } = audioFixture()
    context.state = 'suspended'
    let resume!: () => void
    context.resume.mockReturnValue(
      new Promise<void>((resolve) => {
        resume = resolve
      }),
    )
    const sounds = new SelectionSounds()
    sounds.play(true, [0, 100])
    sounds.play(false, [0])
    context.state = 'running'
    resume()
    await Promise.resolve()
    expect(context.createOscillator).toHaveBeenCalledTimes(3)
    sounds.dispose()
  })

  it('discards very late audio instead of playing it after the animation', async () => {
    const { context } = audioFixture()
    vi.spyOn(performance, 'now').mockReturnValueOnce(0).mockReturnValue(200)
    const sounds = new SelectionSounds()
    sounds.play(true, [0, 100])
    await Promise.resolve()
    expect(context.createOscillator).not.toHaveBeenCalled()
    sounds.dispose()
  })

  it('cancels a pending resume when the selection screen is disposed', async () => {
    const { context } = audioFixture()
    context.state = 'suspended'
    let resume!: () => void
    context.resume.mockReturnValue(
      new Promise<void>((resolve) => {
        resume = resolve
      }),
    )
    const sounds = new SelectionSounds()
    sounds.play(true, [0, 100, 200])
    sounds.dispose()
    context.state = 'running'
    resume()
    await Promise.resolve()
    expect(context.createOscillator).not.toHaveBeenCalled()
    expect(context.close).toHaveBeenCalledOnce()
  })

  it('survives unsupported or blocked audio without throwing', async () => {
    vi.stubGlobal('AudioContext', undefined)
    expect(() => new SelectionSounds().play(true, [0])).not.toThrow()
    const { context } = audioFixture()
    context.state = 'suspended'
    context.resume.mockRejectedValue(new Error('blocked'))
    const sounds = new SelectionSounds()
    sounds.play(true, [0])
    await Promise.resolve()
    await Promise.resolve()
    expect(context.createOscillator).not.toHaveBeenCalled()
    sounds.dispose()
  })
})
