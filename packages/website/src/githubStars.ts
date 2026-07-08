import { Option, Schema as S } from 'effect'
import { AsyncData } from 'foldkit'

export const GitHubStarsAsyncData = AsyncData.Schema(S.Number, S.String)
export type GitHubStarsAsyncData = typeof GitHubStarsAsyncData.schema.Type

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

export const maybeStarCount = (
  stars: GitHubStarsAsyncData,
): Option.Option<number> => AsyncData.getData(stars)
