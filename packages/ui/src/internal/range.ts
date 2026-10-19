export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

export const normalizeRangeMax = (min: number, max: number): number =>
  Math.max(min, max)

/** Computes the fraction (0–1) of a value between min and max. Returns 0
 *  when the range has zero or negative width. */
export const fractionOfValue = (
  value: number,
  min: number,
  max: number,
): number => {
  if (max <= min) {
    return 0
  }

  return clamp((value - min) / (max - min), 0, 1)
}

export const percentageFromFraction = (fraction: number): string =>
  `${Math.round(fraction * 10000) / 100}%`
