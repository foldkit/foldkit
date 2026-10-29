import { Effect, Option, Schema } from 'effect'
import { KeyValueStore } from 'effect/persistence'

import { STORAGE_KEY } from './constant'
import { SavedBoard, SavedBoardJsonString } from './model'

export const Flags = Schema.Struct({
  maybeSavedBoard: Schema.Option(SavedBoard),
})
export type Flags = typeof Flags.Type

export const flags = Effect.gen(function* () {
  const store = yield* KeyValueStore.KeyValueStore
  const json = yield* Effect.fromOption(
    Option.fromNullishOr(yield* store.get(STORAGE_KEY)),
  )
  const decoded = yield* Schema.decodeEffect(SavedBoardJsonString)(json)

  return Flags.make({ maybeSavedBoard: Option.some(decoded) })
}).pipe(
  Effect.catch(() =>
    Effect.succeed(Flags.make({ maybeSavedBoard: Option.none() })),
  ),
)
