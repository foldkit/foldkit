import { BrowserKeyValueStore } from '@effect/platform-browser'
import { Effect, Match as M, Option, Schema as S } from 'effect'
import { KeyValueStore } from 'effect/unstable/persistence'
import { Url } from 'foldkit/url'

import { Command, RedirectToDashboard, RedirectToLogin } from './command'
import { SESSION_STORAGE_KEY } from './constant'
import { Session } from './domain/session'
import { LoggedIn, LoggedOut, Model } from './model'
import { DashboardRoute, LoginRoute, urlToAppRoute } from './route'

// FLAGS

export const Flags = S.Struct({
  maybeSession: S.Option(Session),
})

export const flags: Effect.Effect<Flags> = Effect.gen(function* () {
  const store = yield* KeyValueStore.KeyValueStore
  const sessionJson = yield* Effect.fromOption(
    Option.fromNullishOr(yield* store.get(SESSION_STORAGE_KEY)),
  )

  const decodeSession = S.decodeEffect(S.fromJsonString(Session))
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

type InitReturn = [Model, ReadonlyArray<Command>]
const withInitReturn = M.withReturnType<InitReturn>()

export const init = (flags: Flags, url: Url): InitReturn => {
  const route = urlToAppRoute(url)

  return Option.match(flags.maybeSession, {
    onNone: () =>
      M.value(route).pipe(
        withInitReturn,
        M.tag('Home', 'Login', 'NotFound', route => [
          LoggedOut.init(route),
          [],
        ]),
        M.orElse(() => [LoggedOut.init(LoginRoute()), [RedirectToLogin()]]),
      ),

    onSome: session =>
      M.value(route).pipe(
        withInitReturn,
        M.tag('Dashboard', 'Settings', 'NotFound', route => [
          LoggedIn.init(route, session),
          [],
        ]),
        M.orElse(() => [
          LoggedIn.init(DashboardRoute(), session),
          [RedirectToDashboard()],
        ]),
      ),
  })
}
