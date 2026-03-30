import { describe, expect, test } from 'vitest'

import { createEmptyGrid } from './grid'
import { type Action, reducer } from './reducer'
import type { PaletteIndex, State } from './types'

const emptyModel: State = {
  grid: createEmptyGrid(4),
  undoStack: [],
  redoStack: [],
  selectedColorIndex: 0,
  gridSize: 4,
  tool: 'Brush',
  mirrorMode: 'None',
  isDrawing: false,
  hoveredCell: null,
  paletteThemeIndex: 0,
  exportError: null,
  isErrorDialogOpen: false,
  pendingGridSize: null,
  isGridSizeDialogOpen: false,
}

const dispatch = (state: State, ...actions: ReadonlyArray<Action>): State =>
  actions.reduce<State>(
    (currentState, action) => reducer(currentState, action),
    state,
  )

describe('brush tool', () => {
  test('painting a cell sets its color and pushes undo history', () => {
    const result = dispatch(emptyModel, { type: 'PressedCell', x: 1, y: 2 })

    expect(result.grid[2]?.[1]).toBe(0)
    expect(result.undoStack).toHaveLength(1)
    expect(result.redoStack).toHaveLength(0)
    expect(result.isDrawing).toBe(true)
  })

  test('dragging paints multiple cells within a single undo entry', () => {
    const result = dispatch(
      emptyModel,
      { type: 'PressedCell', x: 0, y: 0 },
      { type: 'EnteredCell', x: 1, y: 0 },
      { type: 'EnteredCell', x: 2, y: 0 },
      { type: 'ReleasedMouse' },
    )

    expect(result.grid[0]?.[0]).toBe(0)
    expect(result.grid[0]?.[1]).toBe(0)
    expect(result.grid[0]?.[2]).toBe(0)
    expect(result.undoStack).toHaveLength(1)
    expect(result.isDrawing).toBe(false)
  })
})

describe('undo and redo', () => {
  test('undo restores the previous grid state', () => {
    const afterPaint = dispatch(
      emptyModel,
      { type: 'PressedCell', x: 0, y: 0 },
      { type: 'ReleasedMouse' },
    )
    expect(afterPaint.grid[0]?.[0]).toBe(0)
    expect(afterPaint.undoStack).toHaveLength(1)

    const afterUndo = dispatch(afterPaint, { type: 'ClickedUndo' })
    expect(afterUndo.grid[0]?.[0]).toBeNull()
    expect(afterUndo.undoStack).toHaveLength(0)
    expect(afterUndo.redoStack).toHaveLength(1)
  })

  test('redo re-applies the undone state', () => {
    const result = dispatch(
      emptyModel,
      { type: 'PressedCell', x: 0, y: 0 },
      { type: 'ReleasedMouse' },
      { type: 'ClickedUndo' },
      { type: 'ClickedRedo' },
    )

    expect(result.grid[0]?.[0]).toBe(0)
    expect(result.undoStack).toHaveLength(1)
    expect(result.redoStack).toHaveLength(0)
  })

  test('new stroke after undo clears the redo stack', () => {
    const afterUndo = dispatch(
      emptyModel,
      { type: 'PressedCell', x: 0, y: 0 },
      { type: 'ReleasedMouse' },
      { type: 'ClickedUndo' },
    )
    expect(afterUndo.redoStack).toHaveLength(1)

    const afterNewStroke = dispatch(
      afterUndo,
      { type: 'PressedCell', x: 1, y: 1 },
      { type: 'ReleasedMouse' },
    )
    expect(afterNewStroke.redoStack).toHaveLength(0)
    expect(afterNewStroke.undoStack).toHaveLength(1)
  })

  test('undo on empty stack is a no-op', () => {
    const result = dispatch(emptyModel, { type: 'ClickedUndo' })

    expect(result.grid).toEqual(emptyModel.grid)
    expect(result.undoStack).toHaveLength(0)
  })

  test('redo on empty stack is a no-op', () => {
    const result = dispatch(emptyModel, { type: 'ClickedRedo' })

    expect(result.grid).toEqual(emptyModel.grid)
    expect(result.redoStack).toHaveLength(0)
  })

  test('multiple undo steps walk back through history', () => {
    const afterTwoStrokes = dispatch(
      emptyModel,
      { type: 'PressedCell', x: 0, y: 0 },
      { type: 'ReleasedMouse' },
      { type: 'SelectedColor', colorIndex: 1 as PaletteIndex },
      { type: 'PressedCell', x: 1, y: 1 },
      { type: 'ReleasedMouse' },
    )
    expect(afterTwoStrokes.grid[0]?.[0]).toBe(0)
    expect(afterTwoStrokes.grid[1]?.[1]).toBe(1)
    expect(afterTwoStrokes.undoStack).toHaveLength(2)

    const afterFirstUndo = dispatch(afterTwoStrokes, { type: 'ClickedUndo' })
    expect(afterFirstUndo.grid[0]?.[0]).toBe(0)
    expect(afterFirstUndo.grid[1]?.[1]).toBeNull()

    const afterSecondUndo = dispatch(afterFirstUndo, { type: 'ClickedUndo' })
    expect(afterSecondUndo.grid[0]?.[0]).toBeNull()
    expect(afterSecondUndo.grid[1]?.[1]).toBeNull()
  })
})

describe('mirror mode', () => {
  test('horizontal mirror paints at mirrored x position', () => {
    const result = dispatch(
      emptyModel,
      { type: 'ToggledMirrorHorizontal' },
      { type: 'PressedCell', x: 0, y: 1 },
    )

    expect(result.grid[1]?.[0]).toBe(0)
    expect(result.grid[1]?.[3]).toBe(0)
  })

  test('vertical mirror paints at mirrored y position', () => {
    const result = dispatch(
      emptyModel,
      { type: 'ToggledMirrorVertical' },
      { type: 'PressedCell', x: 1, y: 0 },
    )

    expect(result.grid[0]?.[1]).toBe(0)
    expect(result.grid[3]?.[1]).toBe(0)
  })

  test('both mirrors paint at all four symmetric positions', () => {
    const result = dispatch(
      emptyModel,
      { type: 'ToggledMirrorHorizontal' },
      { type: 'ToggledMirrorVertical' },
      { type: 'PressedCell', x: 0, y: 0 },
    )

    expect(result.grid[0]?.[0]).toBe(0)
    expect(result.grid[0]?.[3]).toBe(0)
    expect(result.grid[3]?.[0]).toBe(0)
    expect(result.grid[3]?.[3]).toBe(0)
    expect(result.grid[1]?.[1]).toBeNull()
  })
})

describe('fill tool', () => {
  test('flood fill colors a contiguous region', () => {
    const result = dispatch(
      emptyModel,
      { type: 'SelectedTool', tool: 'Fill' },
      { type: 'PressedCell', x: 0, y: 0 },
    )

    const allPainted = result.grid.every(row => row.every(cell => cell === 0))
    expect(allPainted).toBe(true)
    expect(result.undoStack).toHaveLength(1)
  })

  test('fill does not cross color boundaries', () => {
    const gridWithBarrier = createEmptyGrid(4).map(row =>
      row.map((cell, x) => (x === 2 ? (1 as PaletteIndex) : cell)),
    )
    const modelWithBarrier: State = {
      ...emptyModel,
      grid: gridWithBarrier,
    }

    const result = dispatch(
      modelWithBarrier,
      { type: 'SelectedTool', tool: 'Fill' },
      { type: 'PressedCell', x: 0, y: 0 },
    )

    expect(result.grid[0]?.[0]).toBe(0)
    expect(result.grid[0]?.[1]).toBe(0)
    expect(result.grid[0]?.[2]).toBe(1)
    expect(result.grid[0]?.[3]).toBeNull()
  })
})

describe('grid size', () => {
  test('blank canvas resizes immediately without confirmation', () => {
    const result = dispatch(emptyModel, { type: 'SelectedGridSize', size: 8 })

    expect(result.gridSize).toBe(8)
    expect(result.grid).toHaveLength(8)
    expect(result.pendingGridSize).toBeNull()
    expect(result.isGridSizeDialogOpen).toBe(false)
  })

  test('painted canvas opens confirmation dialog', () => {
    const paintedModel: State = {
      ...emptyModel,
      grid: createEmptyGrid(4).map((row, y) =>
        row.map((cell, x) => (x === 0 && y === 0 ? (0 as PaletteIndex) : cell)),
      ),
    }

    const result = dispatch(paintedModel, { type: 'SelectedGridSize', size: 8 })

    expect(result.pendingGridSize).toBe(8)
    expect(result.isGridSizeDialogOpen).toBe(true)
    expect(result.gridSize).toBe(4)
  })

  test('confirming grid size change resets canvas and history', () => {
    const modelWithPending: State = {
      ...emptyModel,
      pendingGridSize: 8,
      isGridSizeDialogOpen: true,
      undoStack: [createEmptyGrid(4)],
    }

    const result = dispatch(modelWithPending, {
      type: 'ConfirmedGridSizeChange',
    })

    expect(result.gridSize).toBe(8)
    expect(result.grid).toHaveLength(8)
    expect(result.grid[0]).toHaveLength(8)
    expect(result.undoStack).toHaveLength(0)
    expect(result.redoStack).toHaveLength(0)
    expect(result.pendingGridSize).toBeNull()
  })

  test('selecting the same grid size is a no-op', () => {
    const result = dispatch(emptyModel, { type: 'SelectedGridSize', size: 4 })

    expect(result).toBe(emptyModel)
  })
})

describe('clear canvas', () => {
  test('clear resets all cells and pushes undo history', () => {
    const afterPaintAndClear = dispatch(
      emptyModel,
      { type: 'PressedCell', x: 0, y: 0 },
      { type: 'ReleasedMouse' },
      { type: 'ClickedClear' },
    )

    expect(afterPaintAndClear.grid[0]?.[0]).toBeNull()
    expect(afterPaintAndClear.undoStack).toHaveLength(2)

    const afterUndo = dispatch(afterPaintAndClear, { type: 'ClickedUndo' })
    expect(afterUndo.grid[0]?.[0]).toBe(0)
  })
})

describe('export', () => {
  test('export failure sets error state and opens dialog', () => {
    const result = dispatch(emptyModel, {
      type: 'ExportFailed',
      error: 'Canvas export failed',
    })

    expect(result.exportError).toBe('Canvas export failed')
    expect(result.isErrorDialogOpen).toBe(true)
  })

  test('dismissing error dialog clears error state', () => {
    const withError: State = {
      ...emptyModel,
      exportError: 'Canvas export failed',
      isErrorDialogOpen: true,
    }

    const result = dispatch(withError, { type: 'DismissedErrorDialog' })

    expect(result.exportError).toBeNull()
    expect(result.isErrorDialogOpen).toBe(false)
  })
})

describe('hover preview', () => {
  test('entering a cell sets hover position', () => {
    const result = dispatch(emptyModel, { type: 'EnteredCell', x: 2, y: 3 })

    expect(result.hoveredCell).toEqual({ x: 2, y: 3 })
  })

  test('leaving canvas clears hover position', () => {
    const result = dispatch(
      emptyModel,
      { type: 'EnteredCell', x: 2, y: 3 },
      { type: 'LeftCanvas' },
    )

    expect(result.hoveredCell).toBeNull()
  })
})

describe('eraser tool', () => {
  test('eraser removes color from a painted cell', () => {
    const result = dispatch(
      emptyModel,
      { type: 'PressedCell', x: 0, y: 0 },
      { type: 'ReleasedMouse' },
      { type: 'SelectedTool', tool: 'Eraser' },
      { type: 'PressedCell', x: 0, y: 0 },
      { type: 'ReleasedMouse' },
    )

    expect(result.grid[0]?.[0]).toBeNull()
    expect(result.undoStack).toHaveLength(2)
  })
})
