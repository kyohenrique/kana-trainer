import type { Kana } from '../kana/catalog'

export const minimumRetryGap = 3

function validateSample(sample: number): void {
  if (!Number.isFinite(sample) || sample < 0 || sample >= 1)
    throw new RangeError('Random samples must be in [0, 1).')
}

// Fisher–Yates with samples drawn outside the core; never mutates the input.
export function shuffleKana(
  kana: readonly Kana[],
  samples: readonly number[],
): readonly Kana[] {
  if (samples.length !== Math.max(0, kana.length - 1))
    throw new RangeError('Provide one sample for each shuffle step.')
  for (const sample of samples) validateSample(sample)
  const shuffled = [...kana]
  for (let index = shuffled.length - 1; index > 0; index--) {
    const sample = samples[shuffled.length - 1 - index]!
    const target = Math.floor(sample * (index + 1))
    const current = shuffled[index]!
    shuffled[index] = shuffled[target]!
    shuffled[target] = current
  }
  return shuffled
}

export function chooseRetryIndex(
  remainingCount: number,
  sample: number,
): number {
  if (!Number.isSafeInteger(remainingCount) || remainingCount < 0)
    throw new RangeError('Remaining count must be a non-negative integer.')
  validateSample(sample)
  const firstAllowed = Math.min(minimumRetryGap, remainingCount)
  return firstAllowed + Math.floor(sample * (remainingCount - firstAllowed + 1))
}
