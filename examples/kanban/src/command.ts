import { Crypto, Effect, Schema } from 'effect'
import { KeyValueStore } from 'effect/persistence'
import { Command, Dom } from 'foldkit'

import { ADD_CARD_INPUT_ID, STORAGE_KEY } from './constant'
import { Column } from './domain'
import { Message } from './message'
import { SavedBoardJsonString } from './model'

export const GenerateCardId = Command.define('GenerateCardId', {
  args: { columnId: Schema.String, title: Schema.String },
  messages: [Message.CompletedGenerateCardId],
  handler: function* () {
    const crypto = yield* Crypto.Crypto

    return ({ columnId, title }) =>
      Effect.gen(function* () {
        const cardId = yield* Effect.orDie(crypto.randomUUIDv4)

        return Message.CompletedGenerateCardId({ cardId, columnId, title })
      })
  },
})

export const SaveBoard = Command.define('SaveBoard', {
  args: { columns: Schema.Array(Column.Column) },
  messages: [Message.CompletedSaveBoard],
  handler: function* () {
    const store = yield* KeyValueStore.KeyValueStore

    return ({ columns }) =>
      Effect.gen(function* () {
        const encodedBoard = yield* Schema.encodeEffect(SavedBoardJsonString)({
          columns,
        })
        yield* store.set(STORAGE_KEY, encodedBoard)
        return Message.CompletedSaveBoard()
      }).pipe(Effect.catch(() => Effect.succeed(Message.CompletedSaveBoard())))
  },
})

export const FocusAddCardInput = Command.define('FocusAddCardInput', {
  messages: [Message.CompletedFocusAddCardInput],
  handler: function* () {
    return () =>
      Dom.focus(`#${ADD_CARD_INPUT_ID}`).pipe(
        Effect.ignore,
        Effect.as(Message.CompletedFocusAddCardInput()),
      )
  },
})
