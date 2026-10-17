import { Effect, Option, Schema } from 'effect'

import { ApiClientService, Session } from './services'

export const Flags = Schema.Struct({
  maybeSession: Schema.Option(Session),
})
export type Flags = typeof Flags.Type

export const flags = Effect.gen(function* () {
  const apiClient = yield* ApiClientService
  const session = yield* apiClient.restoreSession
  return Flags.make({ maybeSession: Option.some(session) })
}).pipe(
  Effect.catch(() =>
    Effect.succeed(Flags.make({ maybeSession: Option.none() })),
  ),
)
