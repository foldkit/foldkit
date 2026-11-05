import { Number } from 'effect'

export const MIN_RESET_DURATION = 1
export const MAX_RESET_DURATION = 5

export const clampResetSeconds = (seconds: number): number =>
  Number.clamp(seconds, {
    minimum: MIN_RESET_DURATION,
    maximum: MAX_RESET_DURATION,
  })
