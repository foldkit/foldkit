import { Effect, Schema as S } from 'effect'
import { Command } from 'foldkit'

import { parseTypedocJson } from './domain'
import { FailedLoadApiData, SucceededLoadApiData } from './message'
import { TypeDocJson } from './typedoc'

export const LoadApiData = Command.define(
  'LoadApiData',
  SucceededLoadApiData,
  FailedLoadApiData,
)

export const loadApiData = LoadApiData(
  Effect.gen(function* () {
    const [apiJsonModule, highlightsModule] = yield* Effect.tryPromise({
      try: () =>
        Promise.all([
          import('../../generated/api.json'),
          import('virtual:api-highlights'),
        ]),
      catch: error =>
        error instanceof Error ? error.message : 'Unknown error',
    })

    const parsedApi = parseTypedocJson(
      S.decodeUnknownSync(TypeDocJson)(apiJsonModule.default),
    )

    return SucceededLoadApiData({
      apiData: {
        parsedApi,
        highlights: highlightsModule.default,
      },
    })
  }).pipe(
    Effect.catch(error =>
      Effect.succeed(
        FailedLoadApiData({
          error: typeof error === 'string' ? error : 'Failed to load API data',
        }),
      ),
    ),
  ),
)
