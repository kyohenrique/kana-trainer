import type { Voice, Preferences } from '../../shared/preferences/storage'
import paths from './pronunciations.json'

export class TrainingAudio {
  private context: AudioContext | undefined
  private generation = 0
  private cache = new Map<string, Promise<AudioBuffer>>()
  private active = new Set<{
    source: AudioScheduledSourceNode
    start: number
    gain: GainNode
  }>()
  unlock() {
    try {
      this.context ??= new AudioContext()
      if (this.context.state !== 'running')
        void this.context.resume().catch(() => {})
    } catch {
      /* Sound must never block a response. */
    }
  }
  private track(
    source: AudioScheduledSourceNode,
    context: AudioContext,
    start = context.currentTime,
  ) {
    const gain = context.createGain()
    source.connect(gain)
    gain.connect(context.destination)
    const voice = { source, gain, start }
    this.active.add(voice)
    source.onended = () => {
      source.disconnect()
      gain.disconnect()
      this.active.delete(voice)
    }
    return gain
  }
  stop() {
    this.generation++
    const now = this.context?.currentTime ?? 0
    for (const { source, gain, start } of this.active) {
      if (now <= start) {
        gain.gain.value = 0
        source.stop(now)
        continue
      }
      gain.gain.cancelScheduledValues(now)
      gain.gain.setValueAtTime(gain.gain.value, now)
      gain.gain.linearRampToValueAtTime(0, now + 0.008)
      try {
        source.stop(now + 0.008)
      } catch {
        /* Already ended. */
      }
    }
    this.active.clear()
  }
  async play(
    kanaId: string,
    correct: boolean,
    voice: Voice,
    volumes: Pick<Preferences, 'effectsVolume' | 'pronunciationVolume'> = {
      effectsVolume: 0.75,
      pronunciationVolume: 0.8,
    },
    kind: 'all' | 'effect' | 'pronunciation' = 'all',
  ) {
    this.stop()
    this.unlock()
    const context = this.context,
      generation = this.generation
    if (!context) return
    try {
      if (context.state !== 'running') await context.resume()
      if (generation !== this.generation) return
      const now = context.currentTime
      const effectsVolume = Math.max(0, Math.min(1, volumes.effectsVolume))
      const pronunciationVolume = Math.max(
        0,
        Math.min(1, volumes.pronunciationVolume),
      )
      const effectDuration = correct ? 0.14 : 0.22
      const withEffect = kind !== 'pronunciation' && effectsVolume > 0
      if (withEffect) {
        const oscillator = context.createOscillator()
        const output = this.track(oscillator, context)
        oscillator.disconnect()
        const envelope = context.createGain()
        envelope.gain.value = 0
        oscillator.connect(envelope)
        envelope.connect(output)
        const cleanup = oscillator.onended
        oscillator.onended = (event) => {
          envelope.disconnect()
          cleanup?.call(oscillator, event)
        }
        oscillator.type = 'sine'
        oscillator.frequency.setValueAtTime(correct ? 392 : 294, now)
        oscillator.frequency.exponentialRampToValueAtTime(
          correct ? 440 : 247,
          now + 0.08,
        )
        envelope.gain.setValueAtTime(0, now)
        // Lower, narrower pitch movement and a slower attack soften repeated feedback.
        envelope.gain.linearRampToValueAtTime(
          (correct ? 0.26 : 0.32) * effectsVolume,
          now + 0.014,
        )
        envelope.gain.setValueAtTime(
          (correct ? 0.26 : 0.32) * effectsVolume,
          now + 0.03,
        )
        envelope.gain.exponentialRampToValueAtTime(
          0.0001,
          now + (correct ? 0.13 : 0.09),
        )
        if (!correct) {
          oscillator.frequency.setValueAtTime(247, now + 0.11)
          oscillator.frequency.exponentialRampToValueAtTime(220, now + 0.2)
          envelope.gain.setValueAtTime(0.0001, now + 0.11)
          envelope.gain.linearRampToValueAtTime(
            0.28 * effectsVolume,
            now + 0.124,
          )
          envelope.gain.setValueAtTime(0.28 * effectsVolume, now + 0.14)
          envelope.gain.exponentialRampToValueAtTime(0.0001, now + 0.21)
        }
        oscillator.start(now)
        oscillator.stop(now + effectDuration)
      }
      if (kind === 'effect' || pronunciationVolume === 0) return
      const key = (paths as Record<string, string>)[kanaId]
      if (!key) return
      const url = `${import.meta.env.BASE_URL}audio/${voice === 'male' ? 'neural2-c' : 'neural2-b'}/${key}.mp3`
      let buffer = this.cache.get(url)
      if (!buffer) {
        buffer = fetch(url)
          .then((response) => {
            if (!response.ok) throw new Error('Audio unavailable')
            return response.arrayBuffer()
          })
          .then((bytes) => context.decodeAudioData(bytes))
        this.cache.set(url, buffer)
        void buffer.catch(() => this.cache.delete(url))
      }
      const decoded = await buffer
      if (generation !== this.generation || context.state !== 'running') return
      const source = context.createBufferSource()
      source.buffer = decoded
      const start = Math.max(
        context.currentTime,
        now + (withEffect ? effectDuration + 0.02 : 0),
      )
      const gain = this.track(source, context, start)
      gain.gain.value = pronunciationVolume
      source.start(start)
    } catch {
      /* Missing or blocked audio leaves the session usable. */
    }
  }
  dispose() {
    this.stop()
    void this.context?.close().catch(() => {})
    this.context = undefined
    this.cache.clear()
  }
}
