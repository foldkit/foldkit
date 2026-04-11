import { Effect, Schema as S } from 'effect'
import { Command } from 'foldkit'

import { parseTypedocJson } from './domain'
import { FailedLoadApiData, SucceededLoadApiData } from './message'
import { TypeDocJson } from './typedoc'

type LoadApiDataResult =
  | typeof SucceededLoadApiData.Type
  | typeof FailedLoadApiData.Type

// NOTE: The TypeDoc JSON and pre-highlighted HTML are large (~5MB + several MB of Shiki
// HTML). Dynamic imports here create a separate chunk so the landing page doesn't pay for
// them. Vite splits each `import()` into its own on-demand chunk.
const loadApiDataEffect: Effect.Effect<LoadApiDataResult> = Effect.gen(
  function* () {
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
  },
).pipe(
  Effect.catchAll(error =>
    Effect.succeed(
      FailedLoadApiData({
        error: typeof error === 'string' ? error : 'Failed to load API data',
      }),
    ),
  ),
)

export const LoadApiData = Command.define(
  'LoadApiData',
  SucceededLoadApiData,
  FailedLoadApiData,
)

export const loadApiData = LoadApiData(loadApiDataEffect)
