import { Option } from 'effect'
import { Ui } from 'foldkit'
import { bench, describe } from 'vitest'

import { createEmptyGrid } from './grid'
import {
  ClickedRedo,
  ClickedUndo,
  EnteredCell,
  PressedCell,
  ReleasedMouse,
} from './message'
import type { Model } from './model'
import { update } from './update'

const GRID_SIZE = 16

const initialModel: Model = {
  grid: createEmptyGrid(GRID_SIZE),
  undoStack: [],
  redoStack: [],
  selectedColorIndex: 0,
  gridSize: GRID_SIZE,
  tool: 'Brush' as const,
  mirrorMode: 'None' as const,
  isDrawing: false,
  maybeHoveredCell: Option.none(),
  errorDialog: Ui.Dialog.init({ id: 'export-error-dialog' }),
  maybeExportError: Option.none(),
  paletteThemeIndex: 0,
  gridSizeConfirmDialog: Ui.Dialog.init({ id: 'grid-size-confirm-dialog' }),
  maybePendingGridSize: Option.none(),
  toolRadioGroup: Ui.RadioGroup.init({
    id: 'tool-picker',
    selectedValue: 'Brush',
  }),
  gridSizeRadioGroup: Ui.RadioGroup.init({
    id: 'grid-size-picker',
    selectedValue: String(GRID_SIZE),
    orientation: 'Horizontal',
  }),
  paletteRadioGroup: Ui.RadioGroup.init({
    id: 'palette-picker',
    selectedValue: '0',
    orientation: 'Horizontal',
  }),
  mirrorHorizontalSwitch: Ui.Switch.init({ id: 'mirror-horizontal' }),
  mirrorVerticalSwitch: Ui.Switch.init({ id: 'mirror-vertical' }),
  themeListbox: Ui.Listbox.init({ id: 'theme-picker', selectedItem: '0' }),
}

const dispatch = (
  model: Model,
  ...messages: ReadonlyArray<Parameters<typeof update>[1]>
): Model =>
  messages.reduce<Model>(
    (currentModel, message) => update(currentModel, message)[0],
    model,
  )

const buildHistoryModel = (steps: number): Model => {
  let model = initialModel
  for (let i = 0; i < steps; i++) {
    const x = i % GRID_SIZE
    const y = Math.floor(i / GRID_SIZE) % GRID_SIZE
    model = dispatch(model, PressedCell({ x, y }), ReleasedMouse())
  }
  return model
}

describe('update: single operations', () => {
  bench('brush stroke (press + release)', () => {
    dispatch(initialModel, PressedCell({ x: 5, y: 5 }), ReleasedMouse())
  })

  bench('brush drag (5 cells)', () => {
    dispatch(
      initialModel,
      PressedCell({ x: 0, y: 0 }),
      EnteredCell({ x: 1, y: 0 }),
      EnteredCell({ x: 2, y: 0 }),
      EnteredCell({ x: 3, y: 0 }),
      EnteredCell({ x: 4, y: 0 }),
      ReleasedMouse(),
    )
  })

  bench('flood fill (empty grid)', () => {
    const fillModel: Model = { ...initialModel, tool: 'Fill' as const }
    dispatch(fillModel, PressedCell({ x: 0, y: 0 }))
  })
})

describe('update: undo/redo with history', () => {
  const modelWith10Steps = buildHistoryModel(10)
  const modelWith30Steps = buildHistoryModel(30)

  bench('undo (10 history entries)', () => {
    dispatch(modelWith10Steps, ClickedUndo())
  })

  bench('undo (30 history entries)', () => {
    dispatch(modelWith30Steps, ClickedUndo())
  })

  bench('5x undo then 5x redo', () => {
    let model = modelWith10Steps
    for (let i = 0; i < 5; i++) {
      model = update(model, ClickedUndo())[0]
    }
    for (let i = 0; i < 5; i++) {
      model = update(model, ClickedRedo())[0]
    }
  })
})

describe('update: paint sequence (16x16 grid)', () => {
  bench('paint 50 random cells', () => {
    let model = initialModel
    for (let i = 0; i < 50; i++) {
      const x = (i * 7 + 3) % GRID_SIZE
      const y = (i * 11 + 5) % GRID_SIZE
      model = dispatch(model, PressedCell({ x, y }), ReleasedMouse())
    }
  })

  bench('paint 50 cells with mirror mode', () => {
    let model: Model = { ...initialModel, mirrorMode: 'Both' as const }
    for (let i = 0; i < 50; i++) {
      const x = (i * 7 + 3) % GRID_SIZE
      const y = (i * 11 + 5) % GRID_SIZE
      model = dispatch(model, PressedCell({ x, y }), ReleasedMouse())
    }
  })
})
