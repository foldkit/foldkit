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

/**
 * Seeds the star state from the count baked into the page at build time. A
 * baked count starts as `Success`, so the badge renders the real number
 * straight from the prerendered HTML with no loading flash. An absent count
 * (the build-time fetch failed) starts `Loading`, leaving the client fetch to
 * fill it in.
 */
export const initialGitHubStars = (
  bakedStarCount: number | null,
): GitHubStarsAsyncData =>
  Option.match(Option.fromNullishOr(bakedStarCount), {
    onNone: () => GitHubStarsAsyncData.Loading(),
    onSome: data => GitHubStarsAsyncData.Success({ data }),
  })
