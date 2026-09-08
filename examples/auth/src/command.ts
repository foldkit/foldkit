import { Console, Effect, Schema } from 'effect'
import { KeyValueStore } from 'effect/unstable/persistence'
import { Command } from 'foldkit'

import { BrowserKeyValueStore } from '@effect/platform-browser'

import { SESSION_STORAGE_KEY } from './constant'
import { Session, SessionJsonString } from './domain/session'
import { Message } from './message'

export const SaveSession = Command.define('SaveSession', {
  args: { session: Session },
  messages: [Message.SucceededSaveSession, Message.FailedSaveSession],
  execute: ({ session }) =>
    Effect.gen(function* () {
      const store = yield* KeyValueStore.KeyValueStore
      yield* store.set(
        SESSION_STORAGE_KEY,
        Schema.encodeSync(SessionJsonString)(session),
      )
      return Message.SucceededSaveSession()
    }).pipe(
      Effect.catch(error =>
        Effect.succeed(Message.FailedSaveSession({ error: String(error) })),
      ),
      Effect.provide(BrowserKeyValueStore.layerLocalStorage),
    ),
})

export const ClearSession = Command.define('ClearSession', {
  messages: [Message.SucceededClearSession, Message.FailedClearSession],
  execute: Effect.gen(function* () {
    const store = yield* KeyValueStore.KeyValueStore
    yield* store.remove(SESSION_STORAGE_KEY)
    return Message.SucceededClearSession()
  }).pipe(
    Effect.catch(error =>
      Effect.succeed(Message.FailedClearSession({ error: String(error) })),
    ),
    Effect.provide(BrowserKeyValueStore.layerLocalStorage),
  ),
})

export const LogError = Command.define('LogError', {
  args: { entries: Schema.Array(Schema.Unknown) },
  messages: [Message.CompletedLogError],
  execute: ({ entries }) =>
    Console.error(...entries).pipe(Effect.as(Message.CompletedLogError())),
})
