import { Effect, Match, Option, Schema } from 'effect'
import { KeyValueStore } from 'effect/unstable/persistence'
import { Runtime, type Update } from 'foldkit'
import { Url } from 'foldkit/url'

import { BrowserKeyValueStore } from '@effect/platform-browser'

import { SESSION_STORAGE_KEY } from './constant'
import { Session, SessionJsonString } from './domain/session'
import { Message } from './message'
import { LoggedIn, LoggedOut, Model } from './model'
import { AppRoute, urlToAppRoute } from './route'
import { RedirectToDashboard, RedirectToLogin } from './update'

// FLAGS

export const Flags = Schema.Struct({
  maybeSession: Schema.Option(Session),
})

export const flags: Effect.Effect<Flags> = Effect.gen(function* () {
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
  Effect.provide(BrowserKeyValueStore.layerLocalStorage),
)

export type Flags = typeof Flags.Type

// INIT

type InitReturn = Update.Return<Model, Message>
const withInitReturn = Match.withReturnType<InitReturn>()

export const init: Runtime.RoutingApplicationInit<Model, Message, Flags> = (
  flags: Flags,
  url: Url,
): InitReturn => {
  const route = urlToAppRoute(url)

  return Option.match(flags.maybeSession, {
    onNone: () =>
      Match.value(route).pipe(
        withInitReturn,
        Match.tag('Home', 'Login', 'NotFound', route => ({
          model: LoggedOut.init(route),
        })),
        Match.orElse(() => ({
          model: LoggedOut.init(AppRoute.Login()),
          commands: [RedirectToLogin()],
        })),
      ),

    onSome: session =>
      Match.value(route).pipe(
        withInitReturn,
        Match.tag('Dashboard', 'Settings', 'NotFound', route => ({
          model: LoggedIn.init(route, session),
        })),
        Match.orElse(() => ({
          model: LoggedIn.init(AppRoute.Dashboard(), session),
          commands: [RedirectToDashboard()],
        })),
      ),
  })
}
