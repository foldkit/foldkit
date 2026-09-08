import { Crypto, Effect, Schema } from 'effect'
import { KeyValueStore } from 'effect/unstable/persistence'
import { Command, Dom } from 'foldkit'

import { BrowserCrypto, BrowserKeyValueStore } from '@effect/platform-browser'

import { ADD_CARD_INPUT_ID, STORAGE_KEY } from './constant'
import { Column } from './domain'
import { Message } from './message'
import { SavedBoardJsonString } from './model'

export const GenerateCardId = Command.define('GenerateCardId', {
  args: { columnId: Schema.String, title: Schema.String },
  messages: [Message.CompletedGenerateCardId],
  execute: ({ columnId, title }) =>
    Effect.gen(function* () {
      const crypto = yield* Crypto.Crypto
      const cardId = yield* Effect.orDie(crypto.randomUUIDv4)
      return Message.CompletedGenerateCardId({ cardId, columnId, title })
    }).pipe(Effect.provide(BrowserCrypto.layer)),
})

export const SaveBoard = Command.define('SaveBoard', {
  args: { columns: Schema.Array(Column.Column) },
  messages: [Message.CompletedSaveBoard],
  execute: ({ columns }) =>
    Effect.gen(function* () {
      const store = yield* KeyValueStore.KeyValueStore
      yield* store.set(
        STORAGE_KEY,
        Schema.encodeSync(SavedBoardJsonString)({ columns }),
      )
      return Message.CompletedSaveBoard()
    }).pipe(
      Effect.catch(() => Effect.succeed(Message.CompletedSaveBoard())),
      Effect.provide(BrowserKeyValueStore.layerLocalStorage),
    ),
})

export const FocusAddCardInput = Command.define('FocusAddCardInput', {
  messages: [Message.CompletedFocusAddCardInput],
  execute: Dom.focus(`#${ADD_CARD_INPUT_ID}`).pipe(
    Effect.ignore,
    Effect.as(Message.CompletedFocusAddCardInput()),
  ),
})
