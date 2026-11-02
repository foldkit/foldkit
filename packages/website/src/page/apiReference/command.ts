import { Effect, Schema } from 'effect'
import { Command } from 'foldkit'

import { ParsedApiReference } from './domain'
import { Message } from './message'

/** Loads the complete reference, including modules omitted from hydration data. */
export const LoadApiData = Command.define('LoadApiData', {
  messages: [Message.SucceededLoadApiData, Message.FailedLoadApiData],
})

export const loadApiData = Effect.gen(function* () {
  const [parsedApiModule, highlightsModule] = yield* Effect.tryPromise({
    try: () =>
      Promise.all([
        import('virtual:parsed-api'),
        import('virtual:api-highlights'),
      ]),
    catch: error => (error instanceof Error ? error.message : 'Unknown error'),
  })

  const parsedApi = yield* Schema.decodeUnknownEffect(ParsedApiReference)(
    parsedApiModule.default,
  )

  return Message.SucceededLoadApiData({
    apiData: {
      parsedApi,
      highlights: highlightsModule.default,
    },
  })
}).pipe(
  Effect.catch(error =>
    Effect.succeed(
      Message.FailedLoadApiData({
        error: typeof error === 'string' ? error : 'Failed to load API data',
      }),
    ),
  ),
)
