import { Match, Option } from 'effect'
import { modifyFields } from 'foldkit/struct'
import { describe, test } from 'vitest'

import { type Canvas, Message, canvasUpdate } from './application'
import { createEmptyGrid } from './domain/grid'

const GRID_SIZE = 16

const initialModel: Canvas = {
  grid: createEmptyGrid(GRID_SIZE),
  undoStack: [],
  redoStack: [],
  selectedColorIndex: 0,
  gridSize: GRID_SIZE,
  tool: 'Brush',
  mirrorMode: 'None',
  isDrawing: false,
  maybeHoveredCell: Option.none(),
  paletteThemeIndex: 0,
}

type CanvasMessage =
  | typeof Message.PressedCell.Type
  | typeof Message.EnteredCell.Type
  | typeof Message.ReleasedMouse.Type
  | typeof Message.ClickedUndo.Type
  | typeof Message.ClickedRedo.Type

const update = (
  model: Canvas,
  message: CanvasMessage,
): Readonly<{ model: Canvas }> =>
  Match.value(message).pipe(
    Match.withReturnType<Readonly<{ model: Canvas }>>(),
    Match.tagsExhaustive({
      PressedCell: pressedCell => canvasUpdate.PressedCell(model, pressedCell),
      EnteredCell: enteredCell => canvasUpdate.EnteredCell(model, enteredCell),
      ReleasedMouse: () => canvasUpdate.ReleasedMouse(model),
      ClickedUndo: () => canvasUpdate.ClickedUndo(model),
      ClickedRedo: () => canvasUpdate.ClickedRedo(model),
    }),
  )

const dispatch = (
  model: Canvas,
  ...messages: ReadonlyArray<CanvasMessage>
): Canvas =>
  messages.reduce<Canvas>(
    (currentModel, message) => update(currentModel, message).model,
    model,
  )

const buildHistoryModel = (steps: number): Canvas => {
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
      const fillModel: Canvas = modifyFields(initialModel, {
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
      let model: Canvas = modifyFields(initialModel, {
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
