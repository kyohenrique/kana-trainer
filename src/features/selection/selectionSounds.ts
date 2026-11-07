const attackSeconds = 0.0015
const releaseSeconds = 0.012
const tailSeconds = 0.005
const envelopeFloor = 0.0001

interface Voice {
  oscillator: OscillatorNode
  gain: GainNode
  release: GainNode
  start: number
  end: number
}

// Original, quiet modal percussion. No audio files or playback on page load.
export class SelectionSounds {
  private context: AudioContext | undefined
  private generation = 0
  private voices = new Set<Voice>()

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
      // A cancelled future envelope must never fall back to the default gain of 1.
      gain.gain.value = 0
      // Fade cancellation independently, leaving the tap's envelope intact.
      const release = context.createGain()
      release.gain.value = 1
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(fundamental * ratio, start)
      oscillator.frequency.exponentialRampToValueAtTime(
        fundamental * ratio * 0.87,
        start + duration,
      )
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(level, start + attackSeconds)
      gain.gain.exponentialRampToValueAtTime(envelopeFloor, start + duration)
      oscillator.connect(gain)
      gain.connect(release)
      release.connect(context.destination)
      const end = start + duration + tailSeconds
      const voice = { oscillator, gain, release, start, end }
      this.voices.add(voice)
      oscillator.onended = () => {
        oscillator.disconnect()
        gain.disconnect()
        release.disconnect()
        this.voices.delete(voice)
      }
      oscillator.start(start)
      oscillator.stop(end)
    }
  }

  stop() {
    this.generation++
    const now = this.context?.currentTime ?? 0
    for (const voice of this.voices) {
      const { oscillator, gain, release, start, end } = voice
      if (now <= start) {
        gain.gain.cancelScheduledValues(now)
        gain.gain.setValueAtTime(0, now)
        oscillator.stop(now)
      } else if (now < end) {
        // Reach exact silence without extending a nearly finished tap.
        const releaseEnd = Math.min(now + releaseSeconds, end)
        release.gain.setValueAtTime(1, now)
        release.gain.linearRampToValueAtTime(0, releaseEnd)
        oscillator.stop(releaseEnd)
      }
    }
    this.voices.clear()
  }

  dispose() {
    this.stop()
    if (this.context) void this.context.close().catch(() => {})
    this.context = undefined
  }
}
