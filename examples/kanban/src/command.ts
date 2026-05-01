import { KeyValueStore } from 'effect/unstable/http'
import { BrowserKeyValueStore } from '@effect/platform-browser'
import { Effect, Schema as S } from 'effect'
import { Command, Task } from 'foldkit'

import { ADD_CARD_INPUT_ID, STORAGE_KEY } from './constant'
import { Column } from './domain'
import {
  CompletedFocusAddCardInput,
  CompletedSaveBoard,
  GeneratedCardId,
} from './message'
import { SavedBoard } from './model'

const ADD_CARD_INPUT_SELECTOR = `#${ADD_CARD_INPUT_ID}`

export const GenerateCardId = Command.define('GenerateCardId', GeneratedCardId)

export const SaveBoard = Command.define('SaveBoard', CompletedSaveBoard)

export const FocusAddCardInput = Command.define(
  'FocusAddCardInput',
  CompletedFocusAddCardInput,
)

export const generateCardId = (columnId: string, title: string) =>
  GenerateCardId(
    Effect.sync(() =>
      GeneratedCardId({ cardId: crypto.randomUUID(), columnId, title }),
    ),
  )

export const focusAddCardInput = FocusAddCardInput(
  Task.focus(ADD_CARD_INPUT_SELECTOR).pipe(
    Effect.ignore,
    Effect.as(CompletedFocusAddCardInput()),
  ),
)

export const saveBoard = (columns: ReadonlyArray<Column.Column>) =>
  SaveBoard(
    Effect.gen(function* () {
      const store = yield* KeyValueStore.KeyValueStore
      yield* store.set(
        STORAGE_KEY,
        S.encodeSync(S.fromJsonString(SavedBoard))({ columns }),
      )
      return CompletedSaveBoard()
    }).pipe(
      Effect.catch(() => Effect.succeed(CompletedSaveBoard())),
      Effect.provide(BrowserKeyValueStore.layerLocalStorage),
    ),
  )
