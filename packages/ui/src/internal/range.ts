export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

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

export const percentString = (fraction: number): string =>
  `${Math.round(fraction * 10000) / 100}%`
