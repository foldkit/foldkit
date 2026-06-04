import { Match as M, Option, Schema as S } from 'effect'

import { makeRemoteData } from './makeRemoteData'

export const GitHubStarsRemoteData = makeRemoteData(S.String, S.Number)
export type GitHubStarsRemoteData = typeof GitHubStarsRemoteData.Union.Type

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
  stars: GitHubStarsRemoteData,
): Option.Option<number> =>
  M.value(stars).pipe(
    M.tag('Ok', ({ data }) => data),
    M.option,
  )
