import { KeyValueStore } from '@effect/platform'
import { BrowserKeyValueStore } from '@effect/platform-browser'
import { Effect, Option, Schema as S } from 'effect'
import { Runtime, Ui } from 'foldkit'

import {
  DEFAULT_COLOR_INDEX,
  DEFAULT_GRID_SIZE,
  DEFAULT_PALETTE_THEME_INDEX,
  STORAGE_KEY,
} from './constant'
import { createEmptyGrid } from './grid'
import type { Message } from './message'
import { Model, SavedCanvas } from './model'
import { subscriptions } from './subscription'
import { update } from './update'
import { view } from './view'

// FLAGS

const Flags = S.Struct({
  maybeSavedCanvas: S.OptionFromSelf(SavedCanvas),
})
type Flags = typeof Flags.Type

const flags: Effect.Effect<Flags> = Effect.gen(function* () {
  const store = yield* KeyValueStore.KeyValueStore
  const maybeJson = yield* store.get(STORAGE_KEY)
  const json = yield* maybeJson
  const decoded = yield* S.decode(S.parseJson(SavedCanvas))(json)
  return { maybeSavedCanvas: Option.some(decoded) }
}).pipe(
  Effect.catchAll(() => Effect.succeed({ maybeSavedCanvas: Option.none() })),
  Effect.provide(BrowserKeyValueStore.layerLocalStorage),
)

// INIT

const init: Runtime.ProgramInit<Model, Message, Flags> = flags => [
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
    errorDialog: Ui.Dialog.init({ id: 'export-error-dialog' }),
    maybeExportError: Option.none(),
    paletteThemeIndex: Option.match(flags.maybeSavedCanvas, {
      onNone: () => DEFAULT_PALETTE_THEME_INDEX,
      onSome: ({ paletteThemeIndex }) => paletteThemeIndex,
    }),
    gridSizeConfirmDialog: Ui.Dialog.init({ id: 'grid-size-confirm-dialog' }),
    maybePendingGridSize: Option.none(),
    toolRadioGroup: Ui.RadioGroup.init({
      id: 'tool-picker',
      selectedValue: 'Brush',
    }),
    gridSizeRadioGroup: Ui.RadioGroup.init({
      id: 'grid-size-picker',
      selectedValue: Option.match(flags.maybeSavedCanvas, {
        onNone: () => DEFAULT_GRID_SIZE.toString(),
        onSome: ({ gridSize }) => gridSize.toString(),
      }),
      orientation: 'Horizontal',
    }),
    paletteRadioGroup: Ui.RadioGroup.init({
      id: 'palette-picker',
      selectedValue: Option.match(flags.maybeSavedCanvas, {
        onNone: () => DEFAULT_COLOR_INDEX.toString(),
        onSome: ({ selectedColorIndex }) => selectedColorIndex.toString(),
      }),
      orientation: 'Horizontal',
    }),
    mirrorHorizontalSwitch: Ui.Switch.init({ id: 'mirror-horizontal' }),
    mirrorVerticalSwitch: Ui.Switch.init({ id: 'mirror-vertical' }),
    themeListbox: Ui.Listbox.init({
      id: 'theme-picker',
      selectedItem: Option.match(flags.maybeSavedCanvas, {
        onNone: () => DEFAULT_PALETTE_THEME_INDEX.toString(),
        onSome: ({ paletteThemeIndex }) => paletteThemeIndex.toString(),
      }),
    }),
  },
  [],
]

// RUN

const program = Runtime.makeProgram({
  Model,
  Flags,
  flags,
  init,
  update,
  view,
  subscriptions,
  container: document.getElementById('root')!,
})

Runtime.run(program)
