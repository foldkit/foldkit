import { Effect, Option, Record, Result, Schema } from 'effect'
import { AsyncData } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { ApiReferenceComposition } from './definition'
import { ApiReference } from './definition'
import { ParsedApiReference } from './domain'
import { Message } from './message'
import { ApiDataAsyncData, disclosuresForApiData } from './model'

/** Loads the complete reference, including modules omitted from hydration data. */
export const LoadApiData = ApiReference.command('LoadApiData', {
  messages: [Message.SucceededLoadApiData, Message.FailedLoadApiData],
  handler: function* () {
    return () =>
      Effect.gen(function* () {
        const [parsedApiModule, highlightsModule] = yield* Effect.tryPromise({
          try: () =>
            Promise.all([
              import('virtual:parsed-api'),
              import('virtual:api-highlights'),
            ]),
          catch: error =>
            error instanceof Error ? error.message : 'Unknown error',
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
              error:
                typeof error === 'string' ? error : 'Failed to load API data',
            }),
          ),
        ),
      )
  },
})

export const EffectsLayer = LoadApiData.layer

export const informRouteChanged = ApiReference.step(model =>
  Option.match(
    AsyncData.isStale(model.apiData)
      ? AsyncData.revalidate(model.apiData)
      : AsyncData.loadIfMissing(model.apiData),
    {
      onNone: () => ({ model }),
      onSome: apiData => ({
        model: modifyFields(model, { apiData: () => apiData }),
        commands: [LoadApiData()],
      }),
    },
  ),
)

export const update = ApiReferenceComposition.makeUpdate((model, message) =>
  Message.match(message, {
    SucceededLoadApiData: ({ apiData }) => ({
      model: modifyFields(model, {
        apiData: () => ApiDataAsyncData.Success({ data: apiData }),
        disclosures: disclosures =>
          Record.union(
            disclosures,
            disclosuresForApiData(apiData),
            isOpen => isOpen,
          ),
      }),
    }),

    FailedLoadApiData: ({ error }) => ({
      model: modifyFields(model, {
        apiData: apiData => AsyncData.settle(apiData, Result.fail(error)),
      }),
    }),

    ToggledSignature: ({ id, isOpen }) => ({
      model: modifyFields(model, {
        disclosures: disclosures => Record.set(disclosures, id, isOpen),
      }),
    }),
  }),
)
