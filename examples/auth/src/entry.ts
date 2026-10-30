import { Effect, Layer, Option, Schema } from 'effect'
import { KeyValueStore } from 'effect/persistence'
import { Program, Runtime } from 'foldkit'

import { Application, ApplicationLive, Flags } from './application'
import { SESSION_STORAGE_KEY, SessionJsonString } from './domain/session'
import { LoggedInLive } from './page/loggedIn/loggedIn'
import { LoggedOutLive } from './page/loggedOut/loggedOut'
import { LoginLive } from './page/loggedOut/login'
import { ApplicationLayer } from './services'

const flags = Effect.gen(function* () {
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

const program = Program.make(Application, {
  layer: ApplicationLive.pipe(
    Layer.provide(
      Layer.mergeAll(
        LoggedOutLive.pipe(Layer.provide(LoginLive)),
        LoggedInLive,
      ),
    ),
    Layer.provide(ApplicationLayer),
  ),
  Flags,
  container: document.getElementById('root'),
  routing: {
    onUrlRequest: Application.Message.ClickedLink,
    onUrlChange: Application.Message.ChangedUrl,
  },
  devTools: { dispatch: true },
})

Runtime.run(program, { flags: flags.pipe(Effect.provide(ApplicationLayer)) })
