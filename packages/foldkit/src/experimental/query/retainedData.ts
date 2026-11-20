import { Match, Option } from 'effect'

import * as AsyncData from '../../asyncData/index.js'

export const transformRetainedData = <A, E>(
  data: AsyncData.AsyncData<A, E>,
  toNextData: (data: A) => A,
): Option.Option<AsyncData.AsyncData<A, E>> =>
  Match.value(data).pipe(
    Match.withReturnType<Option.Option<AsyncData.AsyncData<A, E>>>(),
    Match.tagsExhaustive({
      Idle: () => Option.none(),
      Loading: () => Option.none(),
      Failure: () => Option.none(),
      Refreshing: ({ data }) =>
        Option.some(AsyncData.Success({ data: toNextData(data) })),
      Success: ({ data }) =>
        Option.some(AsyncData.Success({ data: toNextData(data) })),
      Stale: ({ data, error }) =>
        Option.some(AsyncData.Stale({ data: toNextData(data), error })),
    }),
  )
