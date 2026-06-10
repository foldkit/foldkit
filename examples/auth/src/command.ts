import { Console, Effect, Match as M, Schema as S } from 'effect'
import { KeyValueStore } from 'effect/unstable/persistence'
import { DataCommand } from 'foldkit'
import { load, pushUrl, replaceUrl } from 'foldkit/navigation'
import { ts } from 'foldkit/schema'

import { SESSION_STORAGE_KEY } from './constant'
import { Session } from './domain/session'
import {
  CompletedLoadExternal,
  CompletedLogError,
  CompletedNavigateInternal,
  FailedClearSession,
  FailedSaveSession,
  GotLoggedOutMessage,
  Message,
  SucceededClearSession,
  SucceededSaveSession,
} from './message'
import { LoggedOut } from './page'
import { dashboardRouter, homeRouter, loginRouter } from './route'

export const SaveSession = ts('SaveSession', { session: Session })
export const ClearSession = ts('ClearSession')
export const LogError = ts('LogError', { entries: S.Array(S.Unknown) })
export const NavigateInternal = ts('NavigateInternal', { url: S.String })
export const LoadExternal = ts('LoadExternal', { href: S.String })
export const RedirectToLogin = ts('RedirectToLogin')
export const RedirectToDashboard = ts('RedirectToDashboard')
export const RedirectToHome = ts('RedirectToHome')
export const LiftLoggedOut = ts('LiftLoggedOut', { command: LoggedOut.Command })

export const Command = S.Union([
  SaveSession,
  ClearSession,
  LogError,
  NavigateInternal,
  LoadExternal,
  RedirectToLogin,
  RedirectToDashboard,
  RedirectToHome,
  LiftLoggedOut,
])
export type Command = typeof Command.Type

const liftLoggedOut = DataCommand.delegate(LoggedOut.execute, message =>
  GotLoggedOutMessage({ message }),
)

export const execute = (
  command: Command,
): Effect.Effect<Message, never, KeyValueStore.KeyValueStore> =>
  M.value(command).pipe(
    M.tagsExhaustive({
      SaveSession: ({ session }) =>
        Effect.gen(function* () {
          const store = yield* KeyValueStore.KeyValueStore
          yield* store.set(
            SESSION_STORAGE_KEY,
            S.encodeSync(S.fromJsonString(Session))(session),
          )
          return SucceededSaveSession()
        }).pipe(
          Effect.catch(error =>
            Effect.succeed(FailedSaveSession({ error: String(error) })),
          ),
        ),

      ClearSession: () =>
        Effect.gen(function* () {
          const store = yield* KeyValueStore.KeyValueStore
          yield* store.remove(SESSION_STORAGE_KEY)
          return SucceededClearSession()
        }).pipe(
          Effect.catch(error =>
            Effect.succeed(FailedClearSession({ error: String(error) })),
          ),
        ),

      LogError: ({ entries }) =>
        Console.error(...entries).pipe(Effect.as(CompletedLogError())),

      NavigateInternal: ({ url }) =>
        pushUrl(url).pipe(Effect.as(CompletedNavigateInternal())),

      LoadExternal: ({ href }) =>
        load(href).pipe(Effect.as(CompletedLoadExternal())),

      RedirectToLogin: () =>
        replaceUrl(loginRouter()).pipe(Effect.as(CompletedNavigateInternal())),

      RedirectToDashboard: () =>
        replaceUrl(dashboardRouter()).pipe(
          Effect.as(CompletedNavigateInternal()),
        ),

      RedirectToHome: () =>
        replaceUrl(homeRouter()).pipe(Effect.as(CompletedNavigateInternal())),

      LiftLoggedOut: ({ command }) => liftLoggedOut(command),
    }),
  )
