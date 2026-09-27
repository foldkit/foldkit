import { Clock, Crypto, Effect, Schema } from 'effect'
import { Command } from 'foldkit'

import { BrowserCrypto } from '@effect/platform-browser'

import { Items } from './domain'
import { Message } from './message'
import { ItemsStore } from './store'

const describeError = (error: unknown): string =>
  error instanceof Error ? error.message : 'Something went wrong'

export const AddItem = Command.define('AddItem', {
  args: { text: Schema.String },
  messages: [Message.SucceededAddItem, Message.FailedAddItem],
  execute: ({ text }) =>
    Effect.gen(function* () {
      const crypto = yield* Crypto.Crypto
      const id = yield* crypto.randomUUIDv4
      const createdAt = yield* Clock.currentTimeMillis
      const store = yield* ItemsStore
      yield* store.add(
        Items.Item.make({ id, text, isCompleted: false, createdAt }),
      )

      return Message.SucceededAddItem()
    }).pipe(
      Effect.provide(BrowserCrypto.layer),
      Effect.catch(error =>
        Effect.succeed(Message.FailedAddItem({ error: describeError(error) })),
      ),
    ),
})

export const ToggleItem = Command.define('ToggleItem', {
  args: { id: Schema.String },
  messages: [Message.CompletedToggleItem, Message.FailedPersistItems],
  execute: ({ id }) =>
    Effect.gen(function* () {
      const store = yield* ItemsStore
      yield* store.toggle(id)

      return Message.CompletedToggleItem()
    }).pipe(
      Effect.catch(error =>
        Effect.succeed(
          Message.FailedPersistItems({ error: describeError(error) }),
        ),
      ),
    ),
})

export const DeleteItem = Command.define('DeleteItem', {
  args: { id: Schema.String },
  messages: [Message.CompletedDeleteItem, Message.FailedPersistItems],
  execute: ({ id }) =>
    Effect.gen(function* () {
      const store = yield* ItemsStore
      yield* store.delete(id)

      return Message.CompletedDeleteItem()
    }).pipe(
      Effect.catch(error =>
        Effect.succeed(
          Message.FailedPersistItems({ error: describeError(error) }),
        ),
      ),
    ),
})

export const ClearCompleted = Command.define('ClearCompleted', {
  messages: [Message.CompletedClearCompleted, Message.FailedPersistItems],
  execute: Effect.gen(function* () {
    const store = yield* ItemsStore
    yield* store.clearCompleted

    return Message.CompletedClearCompleted()
  }).pipe(
    Effect.catch(error =>
      Effect.succeed(
        Message.FailedPersistItems({ error: describeError(error) }),
      ),
    ),
  ),
})
