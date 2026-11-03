import { Effect } from 'effect'

import {
  ConstructorSource,
  InvocationSource,
  Message,
  ProviderFailure,
  Read,
} from './hostContract.js'

export const ReadEffectsLayer = Read.toLayer(
  Effect.gen(function* () {
    const base = yield* ConstructorSource
    if (base < 0) {
      return yield* new ProviderFailure({ reason: 'Unavailable' })
    }
    return () =>
      Effect.map(InvocationSource, value =>
        Message.CompletedRead({ value: base + value }),
      )
  }),
)
