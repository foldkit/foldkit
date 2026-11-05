import { Effect, Schema } from 'effect'
import { SecureRandom } from 'effect/crypto'
import { KeyValueStore } from 'effect/persistence'
import { Dom } from 'foldkit'

import { makeCommand } from './block'
import { ADD_CARD_INPUT_ID, STORAGE_KEY } from './constant'
import { Column } from './domain'
import { Message } from './message'
import { SavedBoardJsonString } from './model'

export const GenerateCardId = makeCommand('GenerateCardId', {
  args: { columnId: Schema.String, title: Schema.String },
  messages: [Message.CompletedGenerateCardId],
  handler: function* () {
    const secureRandom = yield* SecureRandom.SecureRandom

    return ({ columnId, title }) =>
      Effect.gen(function* () {
        const cardId = yield* secureRandom.uuidV4()

        return Message.CompletedGenerateCardId({ cardId, columnId, title })
      })
  },
})

export const SaveBoard = makeCommand('SaveBoard', {
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

export const FocusAddCardInput = makeCommand('FocusAddCardInput', {
  messages: [Message.CompletedFocusAddCardInput],
  handler: function* () {
    return () =>
      Dom.focus(`#${ADD_CARD_INPUT_ID}`).pipe(
        Effect.ignore,
        Effect.as(Message.CompletedFocusAddCardInput()),
      )
  },
})
