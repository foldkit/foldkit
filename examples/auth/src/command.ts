import { Console, Effect, Layer, Schema } from 'effect'
import { KeyValueStore } from 'effect/persistence'
import { Command } from 'foldkit'
import { load, pushUrl, replaceUrl } from 'foldkit/navigation'

import { BrowserKeyValueStore } from '@effect/platform-browser'

import { SESSION_STORAGE_KEY } from './constant'
import { Session, SessionJsonString } from './domain/session'
import { Message } from './message'
import { dashboardRouter, homeRouter, loginRouter } from './route'

export const SaveSession = Command.define('SaveSession', {
  args: { session: Session },
  messages: [Message.SucceededSaveSession, Message.FailedSaveSession],
})

const SaveSessionLive = SaveSession.toLayer(({ session }) =>
  Effect.gen(function* () {
    const store = yield* KeyValueStore.KeyValueStore
    const encodedSession =
      yield* Schema.encodeEffect(SessionJsonString)(session)
    yield* store.set(SESSION_STORAGE_KEY, encodedSession)
    return Message.SucceededSaveSession()
  }).pipe(
    Effect.catch(error =>
      Effect.succeed(Message.FailedSaveSession({ error: String(error) })),
    ),
    Effect.provide(BrowserKeyValueStore.layerLocalStorage),
  ),
)

export const ClearSession = Command.define('ClearSession', {
  messages: [Message.SucceededClearSession, Message.FailedClearSession],
})

const ClearSessionLive = ClearSession.toLayer(() =>
  Effect.gen(function* () {
    const store = yield* KeyValueStore.KeyValueStore
    yield* store.remove(SESSION_STORAGE_KEY)
    return Message.SucceededClearSession()
  }).pipe(
    Effect.catch(error =>
      Effect.succeed(Message.FailedClearSession({ error: String(error) })),
    ),
    Effect.provide(BrowserKeyValueStore.layerLocalStorage),
  ),
)

export const LogError = Command.define('LogError', {
  args: { entries: Schema.Array(Schema.Unknown) },
  messages: [Message.CompletedLogError],
})

const LogErrorLive = LogError.toLayer(({ entries }) =>
  Console.error(...entries).pipe(Effect.as(Message.CompletedLogError())),
)

export const NavigateInternal = Command.define('NavigateInternal', {
  args: { url: Schema.String },
  messages: [Message.CompletedNavigateInternal],
})

const NavigateInternalLive = NavigateInternal.toLayer(({ url }) =>
  pushUrl(url).pipe(Effect.as(Message.CompletedNavigateInternal())),
)

export const LoadExternal = Command.define('LoadExternal', {
  args: { href: Schema.String },
  messages: [Message.CompletedLoadExternal],
})

const LoadExternalLive = LoadExternal.toLayer(({ href }) =>
  load(href).pipe(Effect.as(Message.CompletedLoadExternal())),
)

export const RedirectToLogin = Command.define('RedirectToLogin', {
  messages: [Message.CompletedRedirectToLogin],
})

const RedirectToLoginLive = RedirectToLogin.toLayer(() =>
  replaceUrl(loginRouter()).pipe(Effect.as(Message.CompletedRedirectToLogin())),
)

export const RedirectToDashboard = Command.define('RedirectToDashboard', {
  messages: [Message.CompletedRedirectToDashboard],
})

const RedirectToDashboardLive = RedirectToDashboard.toLayer(() =>
  replaceUrl(dashboardRouter()).pipe(
    Effect.as(Message.CompletedRedirectToDashboard()),
  ),
)

export const RedirectToHome = Command.define('RedirectToHome', {
  messages: [Message.CompletedRedirectToHome],
})

const RedirectToHomeLive = RedirectToHome.toLayer(() =>
  replaceUrl(homeRouter()).pipe(Effect.as(Message.CompletedRedirectToHome())),
)

export const CommandsLive = Layer.mergeAll(
  SaveSessionLive,
  ClearSessionLive,
  LogErrorLive,
  NavigateInternalLive,
  LoadExternalLive,
  RedirectToLoginLive,
  RedirectToDashboardLive,
  RedirectToHomeLive,
)
