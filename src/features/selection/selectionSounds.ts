// Original, quiet modal percussion. No audio files or playback on page load.
export class SelectionSounds {
  private context: AudioContext | undefined
  private generation = 0
  private voices = new Set<{ oscillator: OscillatorNode; gain: GainNode }>()

  play(selected: boolean, delays: readonly number[]) {
    this.stop()
    if (delays.length === 0 || typeof AudioContext === 'undefined') return
    const generation = this.generation
    const requestedAt = performance.now()
    try {
      const context = (this.context ??= new AudioContext())
      // Called directly from a click/keyboard gesture to satisfy autoplay rules.
      const ready =
        context.state === 'running' ? Promise.resolve() : context.resume()
      void ready
        .then(() => {
          if (
            generation !== this.generation ||
            context.state !== 'running' ||
            performance.now() - requestedAt > 150
          )
            return
          const elapsed = performance.now() - requestedAt
          try {
            for (const delay of delays) {
              // Do not bunch missed taps together after a slow audio resume.
              if (delay > 0 && delay < elapsed) continue
              this.tap(
                context,
                selected,
                context.currentTime + Math.max(0, delay - elapsed) / 1000,
              )
            }
          } catch {
            this.stop()
          }
        })
        .catch(() => {
          // Audio may be blocked by browser/device policy; selection still works.
        })
    } catch {
      // Unsupported or unavailable audio must never interrupt selection.
    }
  }

  private tap(context: AudioContext, selected: boolean, start: number) {
    const fundamental = selected ? 760 : 520
    for (const [ratio, level, duration] of [
      [1, 0.065, 0.065],
      [2.71, 0.025, 0.035],
      [4.13, 0.009, 0.022],
    ] as const) {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(fundamental * ratio, start)
      oscillator.frequency.exponentialRampToValueAtTime(
        fundamental * ratio * 0.87,
        start + duration,
      )
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(level, start + 0.0015)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
      oscillator.connect(gain)
      gain.connect(context.destination)
      const voice = { oscillator, gain }
      this.voices.add(voice)
      oscillator.onended = () => {
        oscillator.disconnect()
        gain.disconnect()
        this.voices.delete(voice)
      }
      oscillator.start(start)
      oscillator.stop(start + duration + 0.005)
    }
  }

  stop() {
    this.generation++
    const now = this.context?.currentTime ?? 0
    for (const { oscillator, gain } of this.voices) {
      gain.gain.cancelScheduledValues(now)
      gain.gain.setTargetAtTime(0, now, 0.003)
      oscillator.stop(now + 0.012)
    }
    this.voices.clear()
  }

  dispose() {
    this.stop()
    if (this.context) void this.context.close().catch(() => {})
    this.context = undefined
  }
}
