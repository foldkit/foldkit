import { Effect, Option, Schema } from 'effect'
import { KeyValueStore } from 'effect/persistence'

import { STORAGE_KEY } from './constant'
import { SavedCanvas, SavedCanvasJsonString } from './model'

export const Flags = Schema.Struct({
  maybeSavedCanvas: Schema.Option(SavedCanvas),
})
export type Flags = typeof Flags.Type

export const flags = Effect.gen(function* () {
  const store = yield* KeyValueStore.KeyValueStore
  const json = yield* Effect.fromOption(
    Option.fromNullishOr(yield* store.get(STORAGE_KEY)),
  )
  const decoded = yield* Schema.decodeEffect(SavedCanvasJsonString)(json)

  return Flags.make({ maybeSavedCanvas: Option.some(decoded) })
}).pipe(
  Effect.catch(() =>
    Effect.succeed(Flags.make({ maybeSavedCanvas: Option.none() })),
  ),
)
