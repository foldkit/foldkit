import { Effect, Option, Schema } from 'effect'
import { KeyValueStore } from 'effect/persistence'

export const Flags = Schema.Struct({
  savedCount: Schema.Option(Schema.Number),
})
export type Flags = typeof Flags.Type

const COUNTER_STORAGE_KEY = 'count'

export const flags = Effect.gen(function* () {
  const store = yield* KeyValueStore.KeyValueStore

  const storedCount = yield* Effect.fromOption(
    Option.fromNullishOr(yield* store.get(COUNTER_STORAGE_KEY)),
  )
  const savedCount = yield* Schema.decodeEffect(Schema.FiniteFromString)(
    storedCount,
  )

  return Flags.make({ savedCount: Option.some(savedCount) })
}).pipe(
  Effect.catch(() => Effect.succeed(Flags.make({ savedCount: Option.none() }))),
)
