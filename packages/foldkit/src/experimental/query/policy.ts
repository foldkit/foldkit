import { Duration, Option } from 'effect'

import * as AsyncData from '../../asyncData/index.js'

/** @internal Resolves the immutable Query freshness policy. */
export const resolveStaleTime = (
  name: string,
  staleTime: Duration.Input | undefined,
): number => {
  const millis = Duration.toMillis(staleTime ?? Duration.infinity)

  if (
    globalThis.Number.isNaN(staleTime) ||
    globalThis.Number.isNaN(millis) ||
    millis < 0
  ) {
    throw new Error(`Query.define("${name}"): staleTime must be nonnegative`)
  }

  return millis
}

/** @internal Checks retained successful data against an explicit Clock time. */
export const isFresh = <A, E>(
  data: AsyncData.AsyncData<A, E>,
  maybeCompletedAtMillis: Option.Option<number>,
  nowMillis: number,
  staleTimeMillis: number,
): boolean => {
  if (!globalThis.Number.isFinite(nowMillis)) {
    throw new Error('Query freshness requires a finite Clock timestamp')
  }

  if (!AsyncData.isSuccess(data) && !AsyncData.isRefreshing(data)) {
    return false
  }

  if (staleTimeMillis === Infinity) {
    return true
  }

  return Option.exists(
    maybeCompletedAtMillis,
    completedAtMillis => nowMillis < completedAtMillis + staleTimeMillis,
  )
}

/** @internal Removes pending state while preserving the last successful data. */
export const cancelData = <A, E>(
  data: AsyncData.AsyncData<A, E>,
): AsyncData.AsyncData<A, E> => {
  if (AsyncData.isLoading(data)) {
    return AsyncData.Idle()
  }

  if (AsyncData.isRefreshing(data)) {
    return AsyncData.Success({ data: data.data })
  }

  return data
}
