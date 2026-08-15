import { Equal, Option } from 'effect'
import { Command, given, message, model, story } from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import { Dialog, Listbox, RadioGroup } from '@foldkit/ui'

import { ExportPng, SaveCanvas } from './command'
import { createEmptyGrid } from './grid'
import {
  ClickedClear,
  ClickedExport,
  ClickedRedo,
  ClickedUndo,
  CompletedSaveCanvas,
  ConfirmedGridSizeChange,
  EnteredCell,
  FailedExportPng,
  GotErrorDialogMessage,
  LeftCanvas,
  PressedCell,
  ReleasedMouse,
  SelectedColor,
  SelectedGridSize,
  SelectedTool,
  SucceededExportPng,
  ToggledMirrorHorizontal,
  ToggledMirrorVertical,
} from './message'
import { type Model, type PaletteIndex } from './model'
import { update } from './update'

const emptyModel: Model = {
  grid: createEmptyGrid(4),
  undoStack: [],
  redoStack: [],
  selectedColorIndex: 0,
  gridSize: 4,
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

describe('brush tool', () => {
  test('painting a cell sets its color and pushes undo history', () => {
    story(
      update,
      given(emptyModel),
      message(PressedCell({ x: 1, y: 2 })),
      model(model => {
        expect(model.grid[2]?.[1]).toEqual(Option.some(0))
        expect(model.undoStack).toHaveLength(1)
        expect(model.redoStack).toHaveLength(0)
        expect(model.isDrawing).toBe(true)
      }),
    )
  })

  test('dragging paints multiple cells within a single undo entry', () => {
    story(
      update,
      given(emptyModel),
      message(PressedCell({ x: 0, y: 0 })),
      message(EnteredCell({ x: 1, y: 0 })),
      message(EnteredCell({ x: 2, y: 0 })),
      message(ReleasedMouse()),
      Command.resolve(SaveCanvas, CompletedSaveCanvas()),
      model(model => {
        expect(model.grid[0]?.[0]).toEqual(Option.some(0))
        expect(model.grid[0]?.[1]).toEqual(Option.some(0))
        expect(model.grid[0]?.[2]).toEqual(Option.some(0))
        expect(model.undoStack).toHaveLength(1)
        expect(model.isDrawing).toBe(false)
      }),
    )
  })
})

describe('undo and redo', () => {
  test('undo restores the previous grid state', () => {
    story(
      update,
      given(emptyModel),
      message(PressedCell({ x: 0, y: 0 })),
      message(ReleasedMouse()),
      Command.resolve(SaveCanvas, CompletedSaveCanvas()),
      model(model => {
        expect(model.grid[0]?.[0]).toEqual(Option.some(0))
        expect(model.undoStack).toHaveLength(1)
      }),
      message(ClickedUndo()),
      Command.resolve(SaveCanvas, CompletedSaveCanvas()),
      model(model => {
        expect(model.grid[0]?.[0]).toEqual(Option.none())
        expect(model.undoStack).toHaveLength(0)
        expect(model.redoStack).toHaveLength(1)
      }),
    )
  })

  test('redo re-applies the undone state', () => {
    story(
      update,
      given(emptyModel),
      message(PressedCell({ x: 0, y: 0 })),
      message(ReleasedMouse()),
      Command.resolve(SaveCanvas, CompletedSaveCanvas()),
      message(ClickedUndo()),
      Command.resolve(SaveCanvas, CompletedSaveCanvas()),
      message(ClickedRedo()),
      Command.resolve(SaveCanvas, CompletedSaveCanvas()),
      model(model => {
        expect(model.grid[0]?.[0]).toEqual(Option.some(0))
        expect(model.undoStack).toHaveLength(1)
        expect(model.redoStack).toHaveLength(0)
      }),
    )
  })

  test('new stroke after undo clears the redo stack', () => {
    story(
      update,
      given(emptyModel),
      message(PressedCell({ x: 0, y: 0 })),
      message(ReleasedMouse()),
      Command.resolve(SaveCanvas, CompletedSaveCanvas()),
      message(ClickedUndo()),
      Command.resolve(SaveCanvas, CompletedSaveCanvas()),
      model(model => {
        expect(model.redoStack).toHaveLength(1)
      }),
      message(PressedCell({ x: 1, y: 1 })),
      message(ReleasedMouse()),
      Command.resolve(SaveCanvas, CompletedSaveCanvas()),
      model(model => {
        expect(model.redoStack).toHaveLength(0)
        expect(model.undoStack).toHaveLength(1)
      }),
    )
  })

  test('undo on empty stack is a no-op', () => {
    story(
      update,
      given(emptyModel),
      message(ClickedUndo()),
      model(model => {
        expect(model.grid).toEqual(emptyModel.grid)
        expect(model.undoStack).toHaveLength(0)
      }),
    )
  })

  test('redo on empty stack is a no-op', () => {
    story(
      update,
      given(emptyModel),
      message(ClickedRedo()),
      model(model => {
        expect(model.grid).toEqual(emptyModel.grid)
        expect(model.redoStack).toHaveLength(0)
      }),
    )
  })

  test('multiple undo steps walk back through history', () => {
    story(
      update,
      given(emptyModel),
      message(PressedCell({ x: 0, y: 0 })),
      message(ReleasedMouse()),
      Command.resolve(SaveCanvas, CompletedSaveCanvas()),
      message(SelectedColor({ colorIndex: 1 })),
      Command.resolve(SaveCanvas, CompletedSaveCanvas()),
      message(PressedCell({ x: 1, y: 1 })),
      message(ReleasedMouse()),
      Command.resolve(SaveCanvas, CompletedSaveCanvas()),
      model(model => {
        expect(model.grid[0]?.[0]).toEqual(Option.some(0))
        expect(model.grid[1]?.[1]).toEqual(Option.some(1))
        expect(model.undoStack).toHaveLength(2)
      }),
      message(ClickedUndo()),
      Command.resolve(SaveCanvas, CompletedSaveCanvas()),
      model(model => {
        expect(model.grid[0]?.[0]).toEqual(Option.some(0))
        expect(model.grid[1]?.[1]).toEqual(Option.none())
      }),
      message(ClickedUndo()),
      Command.resolve(SaveCanvas, CompletedSaveCanvas()),
      model(model => {
        expect(model.grid[0]?.[0]).toEqual(Option.none())
        expect(model.grid[1]?.[1]).toEqual(Option.none())
      }),
    )
  })
})

describe('mirror mode', () => {
  test('horizontal mirror paints at mirrored x position', () => {
    story(
      update,
      given(emptyModel),
      message(ToggledMirrorHorizontal()),
      message(PressedCell({ x: 0, y: 1 })),
      model(model => {
        expect(model.grid[1]?.[0]).toEqual(Option.some(0))
        expect(model.grid[1]?.[3]).toEqual(Option.some(0))
      }),
    )
  })

  test('vertical mirror paints at mirrored y position', () => {
    story(
      update,
      given(emptyModel),
      message(ToggledMirrorVertical()),
      message(PressedCell({ x: 1, y: 0 })),
      model(model => {
        expect(model.grid[0]?.[1]).toEqual(Option.some(0))
        expect(model.grid[3]?.[1]).toEqual(Option.some(0))
      }),
    )
  })

  test('both mirrors paint at all four symmetric positions', () => {
    story(
      update,
      given(emptyModel),
      message(ToggledMirrorHorizontal()),
      message(ToggledMirrorVertical()),
      message(PressedCell({ x: 0, y: 0 })),
      model(model => {
        expect(model.grid[0]?.[0]).toEqual(Option.some(0))
        expect(model.grid[0]?.[3]).toEqual(Option.some(0))
        expect(model.grid[3]?.[0]).toEqual(Option.some(0))
        expect(model.grid[3]?.[3]).toEqual(Option.some(0))
        expect(model.grid[1]?.[1]).toEqual(Option.none())
      }),
    )
  })
})

describe('fill tool', () => {
  test('flood fill colors a contiguous region', () => {
    story(
      update,
      given(emptyModel),
      message(SelectedTool({ tool: 'Fill' })),
      message(PressedCell({ x: 0, y: 0 })),
      Command.resolve(SaveCanvas, CompletedSaveCanvas()),
      model(model => {
        const allPainted = model.grid.every(row =>
          row.every(cell => Equal.equals(cell, Option.some(0))),
        )
        expect(allPainted).toBe(true)
        expect(model.undoStack).toHaveLength(1)
      }),
    )
  })

  test('fill does not cross color boundaries', () => {
    const gridWithBarrier = createEmptyGrid(4).map(row =>
      row.map((cell, x) => (x === 2 ? Option.some<PaletteIndex>(1) : cell)),
    )
    const modelWithBarrier = {
      ...emptyModel,
      grid: gridWithBarrier,
    }

    story(
      update,
      given(modelWithBarrier),
      message(SelectedTool({ tool: 'Fill' })),
      message(PressedCell({ x: 0, y: 0 })),
      Command.resolve(SaveCanvas, CompletedSaveCanvas()),
      model(model => {
        expect(model.grid[0]?.[0]).toEqual(Option.some(0))
        expect(model.grid[0]?.[1]).toEqual(Option.some(0))
        expect(model.grid[0]?.[2]).toEqual(Option.some(1))
        expect(model.grid[0]?.[3]).toEqual(Option.none())
      }),
    )
  })
})

describe('grid size', () => {
  test('blank canvas resizes immediately without confirmation', () => {
    story(
      update,
      given(emptyModel),
      message(SelectedGridSize({ size: 8 })),
      model(model => {
        expect(model.gridSize).toBe(8)
        expect(model.grid).toHaveLength(8)
        expect(model.maybePendingGridSize).toEqual(Option.none())
        expect(model.gridSizeConfirmDialog.isOpen).toBe(false)
      }),
    )
  })

  test('painted canvas opens confirmation dialog', () => {
    const paintedModel: Model = {
      ...emptyModel,
      grid: createEmptyGrid(4).map((row, y) =>
        row.map((cell, x) =>
          x === 0 && y === 0 ? Option.some<PaletteIndex>(0) : cell,
        ),
      ),
    }

    story(
      update,
      given(paintedModel),
      message(SelectedGridSize({ size: 8 })),
      Command.resolve(Dialog.ShowDialog, Dialog.CompletedShowDialog()),
      model(model => {
        expect(model.maybePendingGridSize).toEqual(Option.some(8))
        expect(model.gridSizeConfirmDialog.isOpen).toBe(true)
        expect(model.gridSize).toBe(4)
      }),
    )
  })

  test('confirming grid size change resets canvas and history', () => {
    const modelWithPending: Model = {
      ...emptyModel,
      maybePendingGridSize: Option.some(8),
      gridSizeConfirmDialog: Dialog.init({
        id: 'grid-size-confirm-dialog',
        isOpen: true,
      }),
      undoStack: [createEmptyGrid(4)],
    }

    story(
      update,
      given(modelWithPending),
      message(ConfirmedGridSizeChange()),
      Command.resolve(Dialog.CloseDialog, Dialog.CompletedCloseDialog()),
      Command.resolve(SaveCanvas, CompletedSaveCanvas()),
      model(model => {
        expect(model.gridSize).toBe(8)
        expect(model.grid).toHaveLength(8)
        expect(model.grid[0]).toHaveLength(8)
        expect(model.undoStack).toHaveLength(0)
        expect(model.redoStack).toHaveLength(0)
        expect(model.maybePendingGridSize).toEqual(Option.none())
      }),
    )
  })

  test('selecting the same grid size is a no-op', () => {
    story(
      update,
      given(emptyModel),
      message(SelectedGridSize({ size: 4 })),
      model(model => {
        expect(model).toBe(emptyModel)
      }),
    )
  })
})

describe('clear canvas', () => {
  test('clear resets all cells and pushes undo history', () => {
    story(
      update,
      given(emptyModel),
      message(PressedCell({ x: 0, y: 0 })),
      message(ReleasedMouse()),
      Command.resolve(SaveCanvas, CompletedSaveCanvas()),
      message(ClickedClear()),
      Command.resolve(SaveCanvas, CompletedSaveCanvas()),
      model(model => {
        expect(model.grid[0]?.[0]).toEqual(Option.none())
        expect(model.undoStack).toHaveLength(2)
      }),
      message(ClickedUndo()),
      Command.resolve(SaveCanvas, CompletedSaveCanvas()),
      model(model => {
        expect(model.grid[0]?.[0]).toEqual(Option.some(0))
      }),
    )
  })
})

describe('export', () => {
  test('successful export resolves without changing Model', () => {
    story(
      update,
      given(emptyModel),
      message(ClickedExport()),
      Command.expectHas(ExportPng),
      Command.resolve(ExportPng, SucceededExportPng()),
      model(model => {
        expect(model.grid).toEqual(emptyModel.grid)
        expect(model.maybeExportError).toEqual(Option.none())
      }),
      Command.expectNone(),
    )
  })
})

describe('hover preview', () => {
  test('entering a cell sets hover position', () => {
    story(
      update,
      given(emptyModel),
      message(EnteredCell({ x: 2, y: 3 })),
      model(model => {
        expect(model.maybeHoveredCell).toEqual(Option.some({ x: 2, y: 3 }))
      }),
    )
  })

  test('leaving canvas clears hover position', () => {
    story(
      update,
      given(emptyModel),
      message(EnteredCell({ x: 2, y: 3 })),
      message(LeftCanvas()),
      model(model => {
        expect(model.maybeHoveredCell).toEqual(Option.none())
      }),
    )
  })
})

describe('eraser tool', () => {
  test('eraser removes color from a painted cell', () => {
    story(
      update,
      given(emptyModel),
      message(PressedCell({ x: 0, y: 0 })),
      message(ReleasedMouse()),
      Command.resolve(SaveCanvas, CompletedSaveCanvas()),
      model(model => {
        expect(model.grid[0]?.[0]).toEqual(Option.some(0))
      }),
      message(SelectedTool({ tool: 'Eraser' })),
      message(PressedCell({ x: 0, y: 0 })),
      message(ReleasedMouse()),
      Command.resolve(SaveCanvas, CompletedSaveCanvas()),
      model(model => {
        expect(model.grid[0]?.[0]).toEqual(Option.none())
        expect(model.undoStack).toHaveLength(2)
      }),
    )
  })
})

describe('export failure', () => {
  test('failed export sets error and opens error dialog', () => {
    story(
      update,
      given(emptyModel),
      message(FailedExportPng({ error: 'Canvas 2D context not available' })),
      Command.resolve(Dialog.ShowDialog, Dialog.CompletedShowDialog()),
      model(model => {
        expect(model.maybeExportError).toEqual(
          Option.some('Canvas 2D context not available'),
        )
        expect(model.errorDialog.isOpen).toBe(true)
      }),
    )
  })

  test('dismissing error dialog clears error and closes dialog', () => {
    story(
      update,
      given(emptyModel),
      message(FailedExportPng({ error: 'Canvas 2D context not available' })),
      Command.resolve(Dialog.ShowDialog, Dialog.CompletedShowDialog()),
      message(GotErrorDialogMessage({ message: Dialog.RequestedClose() })),
      Command.resolve(Dialog.CloseDialog, Dialog.CompletedCloseDialog()),
      model(model => {
        expect(model.maybeExportError).toEqual(Option.none())
        expect(model.errorDialog.isOpen).toBe(false)
      }),
    )
  })
})
