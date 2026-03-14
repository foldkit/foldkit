import { KeyValueStore } from '@effect/platform'
import { BrowserKeyValueStore } from '@effect/platform-browser'
import { Console, Effect, Schema as S } from 'effect'
import { Command } from 'foldkit/command'

import { SESSION_STORAGE_KEY } from './constant'
import { Session } from './domain/session'
import {
  ClearedSession,
  CompletedErrorLog,
  FailedSessionClear,
  FailedSessionSave,
  SavedSession,
} from './message'

export const saveSession = (
  session: Session,
): Command<typeof SavedSession | typeof FailedSessionSave> =>
  Effect.gen(function* () {
    const store = yield* KeyValueStore.KeyValueStore
    yield* store.set(
      SESSION_STORAGE_KEY,
      S.encodeSync(S.parseJson(Session))(session),
    )
    return SavedSession()
  }).pipe(
    Effect.catchAll(error =>
      Effect.succeed(FailedSessionSave({ error: String(error) })),
    ),
    Effect.provide(BrowserKeyValueStore.layerLocalStorage),
  )

export const clearSession = (): Command<
  typeof ClearedSession | typeof FailedSessionClear
> =>
  Effect.gen(function* () {
    const store = yield* KeyValueStore.KeyValueStore
    yield* store.remove(SESSION_STORAGE_KEY)
    return ClearedSession()
  }).pipe(
    Effect.catchAll(error =>
      Effect.succeed(FailedSessionClear({ error: String(error) })),
    ),
    Effect.provide(BrowserKeyValueStore.layerLocalStorage),
  )

export const logError = (
  ...args: ReadonlyArray<unknown>
): Command<typeof CompletedErrorLog> =>
  Console.error(...args).pipe(Effect.as(CompletedErrorLog()))
