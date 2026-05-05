import { BrowserKeyValueStore } from '@effect/platform-browser'
import { Effect, Function, Schema as S } from 'effect'
import { KeyValueStore } from 'effect/unstable/persistence'
import { Command, Mount } from 'foldkit'

import { STORAGE_KEY } from './constant'
import { Column } from './domain'
import {
  CompletedFocusAddCardInput,
  CompletedSaveBoard,
  GeneratedCardId,
} from './message'
import { SavedBoard } from './model'

export const GenerateCardId = Command.define('GenerateCardId', GeneratedCardId)

export const SaveBoard = Command.define('SaveBoard', CompletedSaveBoard)

export const FocusAddCardInput = Mount.define(
  'FocusAddCardInput',
  CompletedFocusAddCardInput,
)

export const focusAddCardInput = FocusAddCardInput(element =>
  Effect.sync(() => {
    if (element instanceof HTMLInputElement) {
      element.focus()
    }
    return {
      message: CompletedFocusAddCardInput(),
      cleanup: Function.constVoid,
    }
  }),
)

export const generateCardId = (columnId: string, title: string) =>
  GenerateCardId(
    Effect.sync(() =>
      GeneratedCardId({ cardId: crypto.randomUUID(), columnId, title }),
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
