import { KeyValueStore } from '@effect/platform'
import { BrowserKeyValueStore } from '@effect/platform-browser'
import { Effect, Match as M, Option, Schema as S } from 'effect'
import { Command, Runtime } from 'foldkit'
import { replaceUrl } from 'foldkit/navigation'
import { Url } from 'foldkit/url'

import { SESSION_STORAGE_KEY } from './constant'
import { Session } from './domain/session'
import {
  ChangedUrl,
  ClickedLink,
  CompletedNavigateInternal,
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

// COMMAND

const RedirectToLogin = Command.define(
  'RedirectToLogin',
  CompletedNavigateInternal,
)
const RedirectToDashboard = Command.define(
  'RedirectToDashboard',
  CompletedNavigateInternal,
)

// INIT

type InitReturn = [Model, ReadonlyArray<Command.Command<Message>>]
const withInitReturn = M.withReturnType<InitReturn>()

const init: Runtime.RoutingProgramInit<Model, Message, Flags> = (
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
            RedirectToLogin(
              replaceUrl(loginRouter()).pipe(
                Effect.as(CompletedNavigateInternal()),
              ),
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
            RedirectToDashboard(
              replaceUrl(dashboardRouter()).pipe(
                Effect.as(CompletedNavigateInternal()),
              ),
            ),
          ],
        ]),
      ),
  })
}

// RUN

const program = Runtime.makeProgram({
  Model,
  Flags,
  flags,
  init,
  update,
  view,
  title: model =>
    M.value(model.route).pipe(
      M.tag('Home', () => 'Auth'),
      M.orElse(({ _tag }) => `${_tag} — Auth`),
    ),
  container: document.getElementById('root')!,
  routing: {
    onUrlRequest: request => ClickedLink({ request }),
    onUrlChange: url => ChangedUrl({ url }),
  },
})

Runtime.run(program)
