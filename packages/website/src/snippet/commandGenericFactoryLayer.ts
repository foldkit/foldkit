import { Effect } from 'effect'

import { SearchApi } from './searchApi'
import { makeSearchParts } from './searchFactory'

export const Search = makeSearchParts(SearchApi)

export const EffectsLayer = Search.FetchResults.toLayer(
  Effect.gen(function* () {
    const client = yield* Search.Client

    return ({ query }) =>
      Effect.map(client.search(query), results =>
        Search.Message.CompletedFetchResults({ results }),
      )
  }),
)
