import { Clock, Crypto, Effect, Schema } from 'effect'
import { Command } from 'foldkit'

import { BrowserCrypto } from '@effect/platform-browser'

import { Message } from './message'
import { events } from './schema'
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
      yield* ItemsStore.commit(
        events.itemAddedV2({ id, text, isCompleted: false, createdAt }),
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
  messages: [Message.CompletedToggleItem],
  execute: ({ id }) =>
    Effect.gen(function* () {
      yield* ItemsStore.commit(events.itemToggled({ id }))

      return Message.CompletedToggleItem()
    }),
})

export const DeleteItem = Command.define('DeleteItem', {
  args: { id: Schema.String },
  messages: [Message.CompletedDeleteItem],
  execute: ({ id }) =>
    Effect.gen(function* () {
      yield* ItemsStore.commit(events.itemDeleted({ id }))

      return Message.CompletedDeleteItem()
    }),
})

export const ClearCompleted = Command.define('ClearCompleted', {
  messages: [Message.CompletedClearCompleted],
  execute: Effect.gen(function* () {
    yield* ItemsStore.commit(events.completedItemsCleared({}))

    return Message.CompletedClearCompleted()
  }),
})
