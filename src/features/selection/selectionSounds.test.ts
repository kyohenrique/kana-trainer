import { afterEach, describe, expect, it, vi } from 'vitest'
import { SelectionSounds } from './selectionSounds'

function audioFixture() {
  const parameter = () => ({
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    cancelScheduledValues: vi.fn(),
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
      onended: null,
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
    sounds.play(false, [0])
    await Promise.resolve()
    for (const oscillator of previous)
      expect(oscillator.stop).toHaveBeenLastCalledWith(1.012)
    const off = context.createOscillator.mock.results[9]!.value
    expect(off.frequency.setValueAtTime.mock.calls[0]![0]).toBeLessThan(onPitch)
    sounds.dispose()
    expect(context.close).toHaveBeenCalledOnce()
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
