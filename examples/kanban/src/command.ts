import { BrowserKeyValueStore } from '@effect/platform-browser'
import { Effect, Random, Schema as S } from 'effect'
import { KeyValueStore } from 'effect/unstable/persistence'
import { Command, Dom } from 'foldkit'

import { ADD_CARD_INPUT_ID, STORAGE_KEY } from './constant'
import { Column } from './domain'
import {
  CompletedFocusAddCardInput,
  CompletedSaveBoard,
  GeneratedCardId,
} from './message'
import { SavedBoard } from './model'

export const GenerateCardId = Command.define(
  'GenerateCardId',
  { columnId: S.String, title: S.String },
  GeneratedCardId,
)(({ columnId, title }) =>
  Random.nextUUIDv4.pipe(
    Effect.map(cardId => GeneratedCardId({ cardId, columnId, title })),
  ),
)

export const SaveBoard = Command.define(
  'SaveBoard',
  { columns: S.Array(Column.Column) },
  CompletedSaveBoard,
)(({ columns }) =>
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

export const FocusAddCardInput = Command.define(
  'FocusAddCardInput',
  CompletedFocusAddCardInput,
)(
  Dom.focus(`#${ADD_CARD_INPUT_ID}`).pipe(
    Effect.ignore,
    Effect.as(CompletedFocusAddCardInput()),
  ),
)
