import { Effect, Option, Schema as S } from 'effect'
import { KeyValueStore } from 'effect/unstable/persistence'
import { Runtime } from 'foldkit'

import { BrowserKeyValueStore } from '@effect/platform-browser'
import { Dialog, Listbox } from '@foldkit/ui'

import {
  DEFAULT_COLOR_INDEX,
  DEFAULT_GRID_SIZE,
  DEFAULT_PALETTE_THEME_INDEX,
  STORAGE_KEY,
} from './constant'
import { createEmptyGrid } from './grid'
import { Message } from './message'
import { Model, SavedCanvas, SavedCanvasJsonString } from './model'
import { subscriptions } from './subscription'
import { update } from './update'
import { view } from './view'

// FLAGS

export const Flags = S.Struct({
  maybeSavedCanvas: S.Option(SavedCanvas),
})
export type Flags = typeof Flags.Type

export const flags: Effect.Effect<Flags> = Effect.gen(function* () {
  const store = yield* KeyValueStore.KeyValueStore
  const json = yield* Effect.fromOption(
    Option.fromNullishOr(yield* store.get(STORAGE_KEY)),
  )
  const decoded = yield* S.decodeEffect(SavedCanvasJsonString)(json)
  return Flags.make({ maybeSavedCanvas: Option.some(decoded) })
}).pipe(
  Effect.catch(() =>
    Effect.succeed(Flags.make({ maybeSavedCanvas: Option.none() })),
  ),
  Effect.provide(BrowserKeyValueStore.layerLocalStorage),
)

// INIT

export const init: Runtime.ApplicationInit<Model, Message, Flags> = flags => [
  {
    grid: Option.match(flags.maybeSavedCanvas, {
      onNone: () => createEmptyGrid(DEFAULT_GRID_SIZE),
      onSome: ({ grid }) => grid,
    }),
    undoStack: [],
    redoStack: [],
    selectedColorIndex: Option.match(flags.maybeSavedCanvas, {
      onNone: () => DEFAULT_COLOR_INDEX,
      onSome: ({ selectedColorIndex }) => selectedColorIndex,
    }),
    gridSize: Option.match(flags.maybeSavedCanvas, {
      onNone: () => DEFAULT_GRID_SIZE,
      onSome: ({ gridSize }) => gridSize,
    }),
    tool: 'Brush',
    mirrorMode: 'None',
    isDrawing: false,
    maybeHoveredCell: Option.none(),
    errorDialog: Dialog.init({ id: 'export-error-dialog' }),
    maybeExportError: Option.none(),
    paletteThemeIndex: Option.match(flags.maybeSavedCanvas, {
      onNone: () => DEFAULT_PALETTE_THEME_INDEX,
      onSome: ({ paletteThemeIndex }) => paletteThemeIndex,
    }),
    gridSizeConfirmDialog: Dialog.init({ id: 'grid-size-confirm-dialog' }),
    maybePendingGridSize: Option.none(),
    themeListbox: Listbox.init({ id: 'theme-picker' }),
  },
  [],
]

export { Message, Model, subscriptions, update, view }
