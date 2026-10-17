import { Option } from 'effect'
import { modifyFields } from 'foldkit/struct'
import { describe, test } from 'vitest'

import { Dialog, Listbox, RadioGroup } from '@foldkit/ui'

import { createEmptyGrid } from './grid'
import { Message } from './message'
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
  errorDialog: Dialog.init({ id: 'export-error-dialog' }),
  maybeExportError: Option.none(),
  paletteThemeIndex: 0,
  gridSizeConfirmDialog: Dialog.init({ id: 'grid-size-confirm-dialog' }),
  maybePendingGridSize: Option.none(),
  themeListbox: Listbox.init({ id: 'theme-picker' }),
  toolRadioGroup: RadioGroup.init({ id: 'tool-picker' }),
  gridSizeRadioGroup: RadioGroup.init({ id: 'grid-size-picker' }),
  paletteRadioGroup: RadioGroup.init({ id: 'palette-picker' }),
}

const dispatch = (
  model: Model,
  ...messages: ReadonlyArray<Parameters<typeof update>[1]>
): Model =>
  messages.reduce<Model>(
    (currentModel, message) => update(currentModel, message).model,
    model,
  )

const buildHistoryModel = (steps: number): Model => {
  let model = initialModel
  for (let i = 0; i < steps; i++) {
    const x = i % GRID_SIZE
    const y = Math.floor(i / GRID_SIZE) % GRID_SIZE
    model = dispatch(
      model,
      Message.PressedCell({ x, y }),
      Message.ReleasedMouse(),
    )
  }
  return model
}

describe('update: single operations', () => {
  test('brush stroke (press + release)', async ({ bench }) => {
    await bench('brush stroke (press + release)', () => {
      dispatch(
        initialModel,
        Message.PressedCell({ x: 5, y: 5 }),
        Message.ReleasedMouse(),
      )
    }).run()
  })

  test('brush drag (5 cells)', async ({ bench }) => {
    await bench('brush drag (5 cells)', () => {
      dispatch(
        initialModel,
        Message.PressedCell({ x: 0, y: 0 }),
        Message.EnteredCell({ x: 1, y: 0 }),
        Message.EnteredCell({ x: 2, y: 0 }),
        Message.EnteredCell({ x: 3, y: 0 }),
        Message.EnteredCell({ x: 4, y: 0 }),
        Message.ReleasedMouse(),
      )
    }).run()
  })

  test('flood fill (empty grid)', async ({ bench }) => {
    await bench('flood fill (empty grid)', () => {
      const fillModel: Model = modifyFields(initialModel, {
        tool: () => 'Fill',
      })
      dispatch(fillModel, Message.PressedCell({ x: 0, y: 0 }))
    }).run()
  })
})

describe('update: undo/redo with history', () => {
  const modelWith10Steps = buildHistoryModel(10)
  const modelWith30Steps = buildHistoryModel(30)

  test('undo (10 history entries)', async ({ bench }) => {
    await bench('undo (10 history entries)', () => {
      dispatch(modelWith10Steps, Message.ClickedUndo())
    }).run()
  })

  test('undo (30 history entries)', async ({ bench }) => {
    await bench('undo (30 history entries)', () => {
      dispatch(modelWith30Steps, Message.ClickedUndo())
    }).run()
  })

  test('5x undo then 5x redo', async ({ bench }) => {
    await bench('5x undo then 5x redo', () => {
      let model = modelWith10Steps
      for (let i = 0; i < 5; i++) {
        model = update(model, Message.ClickedUndo()).model
      }
      for (let i = 0; i < 5; i++) {
        model = update(model, Message.ClickedRedo()).model
      }
    }).run()
  })
})

describe('update: paint sequence (16x16 grid)', () => {
  test('paint 50 random cells', async ({ bench }) => {
    await bench('paint 50 random cells', () => {
      let model = initialModel
      for (let i = 0; i < 50; i++) {
        const x = (i * 7 + 3) % GRID_SIZE
        const y = (i * 11 + 5) % GRID_SIZE
        model = dispatch(
          model,
          Message.PressedCell({ x, y }),
          Message.ReleasedMouse(),
        )
      }
    }).run()
  })

  test('paint 50 cells with mirror mode', async ({ bench }) => {
    await bench('paint 50 cells with mirror mode', () => {
      let model: Model = modifyFields(initialModel, {
        mirrorMode: () => 'Both',
      })
      for (let i = 0; i < 50; i++) {
        const x = (i * 7 + 3) % GRID_SIZE
        const y = (i * 11 + 5) % GRID_SIZE
        model = dispatch(
          model,
          Message.PressedCell({ x, y }),
          Message.ReleasedMouse(),
        )
      }
    }).run()
  })
})
