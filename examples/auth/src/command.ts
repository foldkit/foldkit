import { Console, Effect, Layer, Schema } from 'effect'
import { KeyValueStore } from 'effect/persistence'
import { Command } from 'foldkit'

import { BrowserKeyValueStore } from '@effect/platform-browser'

import { SESSION_STORAGE_KEY } from './constant'
import { Session, SessionJsonString } from './domain/session'
import { Message } from './message'

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

export const CommandsLive = Layer.mergeAll(
  SaveSessionLive,
  ClearSessionLive,
  LogErrorLive,
)
