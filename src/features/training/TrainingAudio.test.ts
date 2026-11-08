import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { kanaCatalog } from '../../core/kana/catalog'
import paths from './pronunciations.json'
import { TrainingAudio } from './TrainingAudio'

afterEach(() => vi.unstubAllGlobals())
function fixture() {
  const parameter = () => ({
    value: 1,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    cancelScheduledValues: vi.fn(),
  })
  const source = () => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    frequency: parameter(),
    onended: null,
  })
  const context = {
    currentTime: 1,
    state: 'running',
    destination: {},
    resume: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    decodeAudioData: vi.fn().mockResolvedValue({}),
    createGain: vi.fn(() => ({
      gain: parameter(),
      connect: vi.fn(),
      disconnect: vi.fn(),
    })),
    createOscillator: vi.fn(source),
    createBufferSource: vi.fn(source),
  }
  vi.stubGlobal('AudioContext', function () {
    return context
  })
  return context
}
describe('training audio', () => {
  it('plays gentle lower tones with distinct success and error patterns without fetching speech', async () => {
    const context = fixture()
    const fetcher = vi.fn()
    vi.stubGlobal('fetch', fetcher)
    const audio = new TrainingAudio()
    await audio.play(
      'hiragana:あ',
      true,
      'female',
      { effectsVolume: 0.75, pronunciationVolume: 0.8 },
      'effect',
    )
    const success = context.createGain.mock.results[1]!.value.gain
    expect(success.linearRampToValueAtTime).toHaveBeenCalledExactlyOnceWith(
      0.26 * 0.75,
      1.014,
    )
    await audio.play(
      'hiragana:あ',
      false,
      'female',
      { effectsVolume: 0.75, pronunciationVolume: 0.8 },
      'effect',
    )
    const error = context.createGain.mock.results[3]!.value.gain
    expect(error.linearRampToValueAtTime).toHaveBeenCalledTimes(2)
    expect(error.linearRampToValueAtTime).toHaveBeenCalledWith(
      0.32 * 0.75,
      1.014,
    )
    expect(error.linearRampToValueAtTime).toHaveBeenCalledWith(
      0.28 * 0.75,
      1.124,
    )
    expect(
      context.createOscillator.mock.results[0]!.value.frequency.setValueAtTime,
    ).toHaveBeenCalledWith(392, 1)
    expect(
      context.createOscillator.mock.results[1]!.value.frequency.setValueAtTime,
    ).toHaveBeenCalledWith(294, 1)
    expect(
      context.createOscillator.mock.results[0]!.value.frequency
        .exponentialRampToValueAtTime,
    ).toHaveBeenCalledWith(440, 1.08)
    expect(
      context.createOscillator.mock.results[1]!.value.frequency
        .exponentialRampToValueAtTime,
    ).toHaveBeenCalledWith(220, 1.2)
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('supports independent speech volume and silent effects', async () => {
    const context = fixture()
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(1),
    })
    vi.stubGlobal('fetch', fetcher)
    const audio = new TrainingAudio()
    await audio.play('hiragana:あ', true, 'female', {
      effectsVolume: 0,
      pronunciationVolume: 0.3,
    })
    expect(context.createOscillator).not.toHaveBeenCalled()
    expect(context.createGain.mock.results[0]!.value.gain.value).toBe(0.3)
    expect(
      context.createBufferSource.mock.results[0]!.value.start,
    ).toHaveBeenCalledWith(1)
    await audio.play('hiragana:あ', false, 'female', {
      effectsVolume: 0,
      pronunciationVolume: 0,
    })
    expect(context.createBufferSource).toHaveBeenCalledOnce()
    expect(fetcher).toHaveBeenCalledOnce()
  })
  it('covers every existing kana with both local voices', () => {
    for (const kana of kanaCatalog) {
      const key = (paths as Record<string, string>)[kana.id]
      expect(key).toMatch(/^[a-z]+$/)
      for (const voice of ['neural2-b', 'neural2-c'])
        expect(
          readFileSync(`public/audio/${voice}/${key}.mp3`).length,
        ).toBeGreaterThan(0)
    }
  })
  it('never starts a stale pronunciation after a newer request finishes loading', async () => {
    const context = fixture()
    let resolveOld!: (value: Response) => void
    const response = {
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(1),
    } as Response
    const fetcher = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            resolveOld = resolve
          }),
      )
      .mockResolvedValue(response)
    vi.stubGlobal('fetch', fetcher)
    const audio = new TrainingAudio()
    const old = audio.play('hiragana:あ', true, 'female')
    context.currentTime = 1.02
    await audio.play('hiragana:い', false, 'male')
    resolveOld(response)
    await old
    expect(context.createBufferSource).toHaveBeenCalledTimes(1)
    expect(fetcher.mock.calls.map((call) => call[0])).toEqual([
      '/audio/neural2-b/a.mp3',
      '/audio/neural2-c/i.mp3',
    ])
    const voice = context.createBufferSource.mock.results[0]!.value
    // The new pronunciation is still scheduled; stop it before it can begin.
    audio.stop()
    expect(voice.stop).toHaveBeenLastCalledWith(1.02)
    audio.dispose()
  })
  it('fades a playing pronunciation and invalidates pending audio on disposal', async () => {
    const context = fixture()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(1),
      }),
    )
    const audio = new TrainingAudio()
    await audio.play('hiragana:あ', true, 'female')
    const voice = context.createBufferSource.mock.results[0]!.value
    context.currentTime = 1.2
    audio.stop()
    expect(voice.stop).toHaveBeenLastCalledWith(1.208)
    audio.dispose()
    expect(context.close).toHaveBeenCalledOnce()
  })
  it('absorbs unavailable audio without rejecting the answer flow', async () => {
    fixture()
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    await expect(
      new TrainingAudio().play('hiragana:あ', false, 'female'),
    ).resolves.toBeUndefined()
  })
})
