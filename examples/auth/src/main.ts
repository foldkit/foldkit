import { KeyValueStore } from '@effect/platform'
import { BrowserKeyValueStore } from '@effect/platform-browser'
import { Effect, Match as M, Option, Schema as S } from 'effect'
import { Runtime } from 'foldkit'
import { Command } from 'foldkit/command'
import { replaceUrl } from 'foldkit/navigation'
import { Url } from 'foldkit/url'

import { SESSION_STORAGE_KEY } from './constant'
import { Session } from './domain/session'
import {
  ChangedUrl,
  ClickedLink,
  CompletedInternalNavigation,
  Message,
} from './message'
import { LoggedIn, LoggedOut, Model } from './model'
import {
  DashboardRoute,
  LoginRoute,
  dashboardRouter,
  loginRouter,
  urlToAppRoute,
} from './route'
import { update } from './update'
import { view } from './view'

// FLAGS

const Flags = S.Struct({
  maybeSession: S.Option(Session),
})

const flags: Effect.Effect<Flags> = Effect.gen(function* () {
  const store = yield* KeyValueStore.KeyValueStore
  const maybeSessionJson = yield* store.get(SESSION_STORAGE_KEY)
  const sessionJson = yield* maybeSessionJson

  const decodeSession = S.decode(S.parseJson(Session))
  const session = yield* decodeSession(sessionJson)

  return { maybeSession: Option.some(session) }
}).pipe(
  Effect.catchAll(() => Effect.succeed({ maybeSession: Option.none() })),
  Effect.provide(BrowserKeyValueStore.layerLocalStorage),
)

type Flags = typeof Flags.Type

// INIT

type InitReturn = [Model, ReadonlyArray<Command<Message>>]
const withInitReturn = M.withReturnType<InitReturn>()

const init: Runtime.ApplicationInit<Model, Message, Flags> = (
  flags: Flags,
  url: Url,
): InitReturn => {
  const route = urlToAppRoute(url)

  return Option.match(flags.maybeSession, {
    onNone: () =>
      M.value(route).pipe(
        withInitReturn,
        M.tag('Home', 'Login', 'NotFound', route => [
          LoggedOut.init(route),
          [],
        ]),
        M.orElse(() => [
          LoggedOut.init(LoginRoute()),
          [
            replaceUrl(loginRouter()).pipe(
              Effect.as(CompletedInternalNavigation()),
            ),
          ],
        ]),
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
          [
            replaceUrl(dashboardRouter()).pipe(
              Effect.as(CompletedInternalNavigation()),
            ),
          ],
        ]),
      ),
  })
}

// RUN

const app = Runtime.makeApplication({
  Model,
  Flags,
  flags,
  init,
  update,
  view,
  container: document.getElementById('root')!,
  browser: {
    onUrlRequest: request => ClickedLink({ request }),
    onUrlChange: url => ChangedUrl({ url }),
  },
})

Runtime.run(app)
