import { Console, Effect, Schema } from 'effect'
import { KeyValueStore } from 'effect/persistence'
import { Command } from 'foldkit'
import { load, pushUrl, replaceUrl } from 'foldkit/navigation'

import { SESSION_STORAGE_KEY } from './constant'
import { Session, SessionJsonString } from './domain/session'
import { Message } from './message'
import { dashboardRouter, homeRouter, loginRouter } from './route'

export const SaveSession = Command.define(
  'SaveSession',
  {
    args: { session: Session },
    messages: [Message.SucceededSaveSession, Message.FailedSaveSession],
  },
  Effect.gen(function* () {
    const store = yield* KeyValueStore.KeyValueStore

    return ({ session }) =>
      Effect.gen(function* () {
        const encodedSession =
          yield* Schema.encodeEffect(SessionJsonString)(session)
        yield* store.set(SESSION_STORAGE_KEY, encodedSession)
        return Message.SucceededSaveSession()
      }).pipe(
        Effect.catch(error =>
          Effect.succeed(Message.FailedSaveSession({ error: String(error) })),
        ),
      )
  }),
)

export const ClearSession = Command.define(
  'ClearSession',
  {
    messages: [Message.SucceededClearSession, Message.FailedClearSession],
  },
  Effect.gen(function* () {
    const store = yield* KeyValueStore.KeyValueStore

    return () =>
      store.remove(SESSION_STORAGE_KEY).pipe(
        Effect.as(Message.SucceededClearSession()),
        Effect.catch(error =>
          Effect.succeed(Message.FailedClearSession({ error: String(error) })),
        ),
      )
  }),
)

export const LogError = Command.define(
  'LogError',
  {
    args: { entries: Schema.Array(Schema.Unknown) },
    messages: [Message.CompletedLogError],
  },
  Effect.succeed(({ entries }) =>
    Console.error(...entries).pipe(Effect.as(Message.CompletedLogError())),
  ),
)

export const NavigateInternal = Command.define(
  'NavigateInternal',
  {
    args: { url: Schema.String },
    messages: [Message.CompletedNavigateInternal],
  },
  Effect.succeed(({ url }) =>
    pushUrl(url).pipe(Effect.as(Message.CompletedNavigateInternal())),
  ),
)

export const LoadExternal = Command.define(
  'LoadExternal',
  {
    args: { href: Schema.String },
    messages: [Message.CompletedLoadExternal],
  },
  Effect.succeed(({ href }) =>
    load(href).pipe(Effect.as(Message.CompletedLoadExternal())),
  ),
)

export const RedirectToLogin = Command.define(
  'RedirectToLogin',
  {
    messages: [Message.CompletedRedirectToLogin],
  },
  Effect.succeed(() =>
    replaceUrl(loginRouter()).pipe(
      Effect.as(Message.CompletedRedirectToLogin()),
    ),
  ),
)

export const RedirectToDashboard = Command.define(
  'RedirectToDashboard',
  {
    messages: [Message.CompletedRedirectToDashboard],
  },
  Effect.succeed(() =>
    replaceUrl(dashboardRouter()).pipe(
      Effect.as(Message.CompletedRedirectToDashboard()),
    ),
  ),
)

export const RedirectToHome = Command.define(
  'RedirectToHome',
  {
    messages: [Message.CompletedRedirectToHome],
  },
  Effect.succeed(() =>
    replaceUrl(homeRouter()).pipe(Effect.as(Message.CompletedRedirectToHome())),
  ),
)
