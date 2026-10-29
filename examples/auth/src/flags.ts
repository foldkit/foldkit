import { Effect, Option, Schema } from 'effect'
import { KeyValueStore } from 'effect/persistence'

import { SESSION_STORAGE_KEY } from './constant'
import { Session, SessionJsonString } from './domain/session'

export const Flags = Schema.Struct({
  maybeSession: Schema.Option(Session),
})
export type Flags = typeof Flags.Type

export const flags = Effect.gen(function* () {
  const store = yield* KeyValueStore.KeyValueStore

  const sessionJson = yield* Effect.fromOption(
    Option.fromNullishOr(yield* store.get(SESSION_STORAGE_KEY)),
  )

  const decodeSession = Schema.decodeEffect(SessionJsonString)
  const session = yield* decodeSession(sessionJson)

  return Flags.make({ maybeSession: Option.some(session) })
}).pipe(
  Effect.catch(() =>
    Effect.succeed(Flags.make({ maybeSession: Option.none() })),
  ),
)
