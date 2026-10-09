import { Effect } from 'effect'
import { HttpClient } from 'effect/http'

import { FetchCount, fetchCount } from './counterHttpCommand'

export const FetchCountLayer = FetchCount.toLayer(
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient

    return () => fetchCount(client)
  }),
)
