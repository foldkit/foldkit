import { KeyValueStore } from '@effect/platform'
import { BrowserKeyValueStore } from '@effect/platform-browser'
import { Console, Effect, Schema as S } from 'effect'
import { Command } from 'foldkit'

import { SESSION_STORAGE_KEY } from './constant'
import { Session } from './domain/session'
import {
  ClearedSession,
  CompletedLogError,
  FailedClearSession,
  FailedSaveSession,
  SavedSession,
} from './message'

export const saveSession = (
  session: Session,
): Command.Command<typeof SavedSession | typeof FailedSaveSession> =>
  Effect.gen(function* () {
    const store = yield* KeyValueStore.KeyValueStore
    yield* store.set(
      SESSION_STORAGE_KEY,
      S.encodeSync(S.parseJson(Session))(session),
    )
    return SavedSession()
  }).pipe(
    Effect.catchAll(error =>
      Effect.succeed(FailedSaveSession({ error: String(error) })),
    ),
    Effect.provide(BrowserKeyValueStore.layerLocalStorage),
    Command.make('SaveSession'),
  )

export const clearSession = (): Command.Command<
  typeof ClearedSession | typeof FailedClearSession
> =>
  Effect.gen(function* () {
    const store = yield* KeyValueStore.KeyValueStore
    yield* store.remove(SESSION_STORAGE_KEY)
    return ClearedSession()
  }).pipe(
    Effect.catchAll(error =>
      Effect.succeed(FailedClearSession({ error: String(error) })),
    ),
    Effect.provide(BrowserKeyValueStore.layerLocalStorage),
    Command.make('ClearSession'),
  )

export const logError = (
  ...args: ReadonlyArray<unknown>
): Command.Command<typeof CompletedLogError> =>
  Console.error(...args).pipe(
    Effect.as(CompletedLogError()),
    Command.make('LogError'),
  )
