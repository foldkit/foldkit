const ABBREVIATION_THRESHOLD = 1000

export const formatStarCount = (count: number): string => {
  if (count < ABBREVIATION_THRESHOLD) {
    return String(count)
  } else {
    const thousands = count / ABBREVIATION_THRESHOLD
    const rounded = Math.round(thousands * 10) / 10
    return `${rounded}k`
  }
}
