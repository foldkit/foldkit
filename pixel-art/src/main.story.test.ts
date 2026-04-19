import { Equal, Option } from 'effect'
import { Story, Ui } from 'foldkit'
import { describe, expect, test } from 'vitest'

import { ExportPng, SaveCanvas } from './command'
import { createEmptyGrid } from './grid'
import {
  ClickedClear,
  ClickedExport,
  ClickedRedo,
  ClickedUndo,
  CompletedSaveCanvas,
  ConfirmedGridSizeChange,
  DismissedErrorDialog,
  EnteredCell,
  FailedExportPng,
  GotErrorDialogMessage,
  GotGridSizeConfirmDialogMessage,
  GotGridSizeRadioGroupMessage,
  GotPaletteRadioGroupMessage,
  GotToolRadioGroupMessage,
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
    selectedValue: '4',
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

describe('brush tool', () => {
  test('painting a cell sets its color and pushes undo history', () => {
    Story.story(
      update,
      Story.with(emptyModel),
      Story.message(PressedCell({ x: 1, y: 2 })),
      Story.model(model => {
        expect(model.grid[2]?.[1]).toEqual(Option.some(0))
        expect(model.undoStack).toHaveLength(1)
        expect(model.redoStack).toHaveLength(0)
        expect(model.isDrawing).toBe(true)
      }),
    )
  })

  test('dragging paints multiple cells within a single undo entry', () => {
    Story.story(
      update,
      Story.with(emptyModel),
      Story.message(PressedCell({ x: 0, y: 0 })),
      Story.message(EnteredCell({ x: 1, y: 0 })),
      Story.message(EnteredCell({ x: 2, y: 0 })),
      Story.message(ReleasedMouse()),
      Story.resolve(SaveCanvas, CompletedSaveCanvas()),
      Story.model(model => {
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
    Story.story(
      update,
      Story.with(emptyModel),
      Story.message(PressedCell({ x: 0, y: 0 })),
      Story.message(ReleasedMouse()),
      Story.resolve(SaveCanvas, CompletedSaveCanvas()),
      Story.model(model => {
        expect(model.grid[0]?.[0]).toEqual(Option.some(0))
        expect(model.undoStack).toHaveLength(1)
      }),
      Story.message(ClickedUndo()),
      Story.resolve(SaveCanvas, CompletedSaveCanvas()),
      Story.model(model => {
        expect(model.grid[0]?.[0]).toEqual(Option.none())
        expect(model.undoStack).toHaveLength(0)
        expect(model.redoStack).toHaveLength(1)
      }),
    )
  })

  test('redo re-applies the undone state', () => {
    Story.story(
      update,
      Story.with(emptyModel),
      Story.message(PressedCell({ x: 0, y: 0 })),
      Story.message(ReleasedMouse()),
      Story.resolve(SaveCanvas, CompletedSaveCanvas()),
      Story.message(ClickedUndo()),
      Story.resolve(SaveCanvas, CompletedSaveCanvas()),
      Story.message(ClickedRedo()),
      Story.resolve(SaveCanvas, CompletedSaveCanvas()),
      Story.model(model => {
        expect(model.grid[0]?.[0]).toEqual(Option.some(0))
        expect(model.undoStack).toHaveLength(1)
        expect(model.redoStack).toHaveLength(0)
      }),
    )
  })

  test('new stroke after undo clears the redo stack', () => {
    Story.story(
      update,
      Story.with(emptyModel),
      Story.message(PressedCell({ x: 0, y: 0 })),
      Story.message(ReleasedMouse()),
      Story.resolve(SaveCanvas, CompletedSaveCanvas()),
      Story.message(ClickedUndo()),
      Story.resolve(SaveCanvas, CompletedSaveCanvas()),
      Story.model(model => {
        expect(model.redoStack).toHaveLength(1)
      }),
      Story.message(PressedCell({ x: 1, y: 1 })),
      Story.message(ReleasedMouse()),
      Story.resolve(SaveCanvas, CompletedSaveCanvas()),
      Story.model(model => {
        expect(model.redoStack).toHaveLength(0)
        expect(model.undoStack).toHaveLength(1)
      }),
    )
  })

  test('undo on empty stack is a no-op', () => {
    Story.story(
      update,
      Story.with(emptyModel),
      Story.message(ClickedUndo()),
      Story.model(model => {
        expect(model.grid).toEqual(emptyModel.grid)
        expect(model.undoStack).toHaveLength(0)
      }),
    )
  })

  test('redo on empty stack is a no-op', () => {
    Story.story(
      update,
      Story.with(emptyModel),
      Story.message(ClickedRedo()),
      Story.model(model => {
        expect(model.grid).toEqual(emptyModel.grid)
        expect(model.redoStack).toHaveLength(0)
      }),
    )
  })

  test('multiple undo steps walk back through history', () => {
    Story.story(
      update,
      Story.with(emptyModel),
      Story.message(PressedCell({ x: 0, y: 0 })),
      Story.message(ReleasedMouse()),
      Story.resolve(SaveCanvas, CompletedSaveCanvas()),
      Story.message(SelectedColor({ colorIndex: 1 })),
      Story.resolve(
        Ui.RadioGroup.FocusOption,
        Ui.RadioGroup.CompletedFocusOption(),
        radioMessage => GotPaletteRadioGroupMessage({ message: radioMessage }),
      ),
      Story.resolve(SaveCanvas, CompletedSaveCanvas()),
      Story.message(PressedCell({ x: 1, y: 1 })),
      Story.message(ReleasedMouse()),
      Story.resolve(SaveCanvas, CompletedSaveCanvas()),
      Story.model(model => {
        expect(model.grid[0]?.[0]).toEqual(Option.some(0))
        expect(model.grid[1]?.[1]).toEqual(Option.some(1))
        expect(model.undoStack).toHaveLength(2)
      }),
      Story.message(ClickedUndo()),
      Story.resolve(SaveCanvas, CompletedSaveCanvas()),
      Story.model(model => {
        expect(model.grid[0]?.[0]).toEqual(Option.some(0))
        expect(model.grid[1]?.[1]).toEqual(Option.none())
      }),
      Story.message(ClickedUndo()),
      Story.resolve(SaveCanvas, CompletedSaveCanvas()),
      Story.model(model => {
        expect(model.grid[0]?.[0]).toEqual(Option.none())
        expect(model.grid[1]?.[1]).toEqual(Option.none())
      }),
    )
  })
})

describe('mirror mode', () => {
  test('horizontal mirror paints at mirrored x position', () => {
    Story.story(
      update,
      Story.with(emptyModel),
      Story.message(ToggledMirrorHorizontal()),
      Story.message(PressedCell({ x: 0, y: 1 })),
      Story.model(model => {
        expect(model.grid[1]?.[0]).toEqual(Option.some(0))
        expect(model.grid[1]?.[3]).toEqual(Option.some(0))
      }),
    )
  })

  test('vertical mirror paints at mirrored y position', () => {
    Story.story(
      update,
      Story.with(emptyModel),
      Story.message(ToggledMirrorVertical()),
      Story.message(PressedCell({ x: 1, y: 0 })),
      Story.model(model => {
        expect(model.grid[0]?.[1]).toEqual(Option.some(0))
        expect(model.grid[3]?.[1]).toEqual(Option.some(0))
      }),
    )
  })

  test('both mirrors paint at all four symmetric positions', () => {
    Story.story(
      update,
      Story.with(emptyModel),
      Story.message(ToggledMirrorHorizontal()),
      Story.message(ToggledMirrorVertical()),
      Story.message(PressedCell({ x: 0, y: 0 })),
      Story.model(model => {
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
    Story.story(
      update,
      Story.with(emptyModel),
      Story.message(SelectedTool({ tool: 'Fill' })),
      Story.resolve(
        Ui.RadioGroup.FocusOption,
        Ui.RadioGroup.CompletedFocusOption(),
        radioMessage => GotToolRadioGroupMessage({ message: radioMessage }),
      ),
      Story.message(PressedCell({ x: 0, y: 0 })),
      Story.resolve(SaveCanvas, CompletedSaveCanvas()),
      Story.model(model => {
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

    Story.story(
      update,
      Story.with(modelWithBarrier),
      Story.message(SelectedTool({ tool: 'Fill' })),
      Story.resolve(
        Ui.RadioGroup.FocusOption,
        Ui.RadioGroup.CompletedFocusOption(),
        radioMessage => GotToolRadioGroupMessage({ message: radioMessage }),
      ),
      Story.message(PressedCell({ x: 0, y: 0 })),
      Story.resolve(SaveCanvas, CompletedSaveCanvas()),
      Story.model(model => {
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
    Story.story(
      update,
      Story.with(emptyModel),
      Story.message(SelectedGridSize({ size: 8 })),
      Story.resolve(
        Ui.RadioGroup.FocusOption,
        Ui.RadioGroup.CompletedFocusOption(),
        radioMessage => GotGridSizeRadioGroupMessage({ message: radioMessage }),
      ),
      Story.model(model => {
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

    Story.story(
      update,
      Story.with(paintedModel),
      Story.message(SelectedGridSize({ size: 8 })),
      Story.resolve(
        Ui.Dialog.ShowDialog,
        Ui.Dialog.CompletedShowDialog(),
        dialogMessage =>
          GotGridSizeConfirmDialogMessage({ message: dialogMessage }),
      ),
      Story.model(model => {
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
      gridSizeConfirmDialog: Ui.Dialog.init({
        id: 'grid-size-confirm-dialog',
        isOpen: true,
      }),
      undoStack: [createEmptyGrid(4)],
    }

    Story.story(
      update,
      Story.with(modelWithPending),
      Story.message(ConfirmedGridSizeChange()),
      Story.resolve(
        Ui.Dialog.CloseDialog,
        Ui.Dialog.CompletedCloseDialog(),
        dialogMessage =>
          GotGridSizeConfirmDialogMessage({ message: dialogMessage }),
      ),
      Story.resolve(SaveCanvas, CompletedSaveCanvas()),
      Story.model(model => {
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
    Story.story(
      update,
      Story.with(emptyModel),
      Story.message(SelectedGridSize({ size: 4 })),
      Story.model(model => {
        expect(model).toBe(emptyModel)
      }),
    )
  })
})

describe('clear canvas', () => {
  test('clear resets all cells and pushes undo history', () => {
    Story.story(
      update,
      Story.with(emptyModel),
      Story.message(PressedCell({ x: 0, y: 0 })),
      Story.message(ReleasedMouse()),
      Story.resolve(SaveCanvas, CompletedSaveCanvas()),
      Story.message(ClickedClear()),
      Story.resolve(SaveCanvas, CompletedSaveCanvas()),
      Story.model(model => {
        expect(model.grid[0]?.[0]).toEqual(Option.none())
        expect(model.undoStack).toHaveLength(2)
      }),
      Story.message(ClickedUndo()),
      Story.resolve(SaveCanvas, CompletedSaveCanvas()),
      Story.model(model => {
        expect(model.grid[0]?.[0]).toEqual(Option.some(0))
      }),
    )
  })
})

describe('export', () => {
  test('successful export resolves without changing Model', () => {
    Story.story(
      update,
      Story.with(emptyModel),
      Story.message(ClickedExport()),
      Story.expectHasCommands(ExportPng),
      Story.resolve(ExportPng, SucceededExportPng()),
      Story.model(model => {
        expect(model.grid).toEqual(emptyModel.grid)
        expect(model.maybeExportError).toEqual(Option.none())
      }),
      Story.expectNoCommands(),
    )
  })
})

describe('hover preview', () => {
  test('entering a cell sets hover position', () => {
    Story.story(
      update,
      Story.with(emptyModel),
      Story.message(EnteredCell({ x: 2, y: 3 })),
      Story.model(model => {
        expect(model.maybeHoveredCell).toEqual(Option.some({ x: 2, y: 3 }))
      }),
    )
  })

  test('leaving canvas clears hover position', () => {
    Story.story(
      update,
      Story.with(emptyModel),
      Story.message(EnteredCell({ x: 2, y: 3 })),
      Story.message(LeftCanvas()),
      Story.model(model => {
        expect(model.maybeHoveredCell).toEqual(Option.none())
      }),
    )
  })
})

describe('eraser tool', () => {
  test('eraser removes color from a painted cell', () => {
    Story.story(
      update,
      Story.with(emptyModel),
      Story.message(PressedCell({ x: 0, y: 0 })),
      Story.message(ReleasedMouse()),
      Story.resolve(SaveCanvas, CompletedSaveCanvas()),
      Story.model(model => {
        expect(model.grid[0]?.[0]).toEqual(Option.some(0))
      }),
      Story.message(SelectedTool({ tool: 'Eraser' })),
      Story.resolve(
        Ui.RadioGroup.FocusOption,
        Ui.RadioGroup.CompletedFocusOption(),
        radioMessage => GotToolRadioGroupMessage({ message: radioMessage }),
      ),
      Story.message(PressedCell({ x: 0, y: 0 })),
      Story.message(ReleasedMouse()),
      Story.resolve(SaveCanvas, CompletedSaveCanvas()),
      Story.model(model => {
        expect(model.grid[0]?.[0]).toEqual(Option.none())
        expect(model.undoStack).toHaveLength(2)
      }),
    )
  })
})

describe('export failure', () => {
  test('failed export sets error and opens error dialog', () => {
    Story.story(
      update,
      Story.with(emptyModel),
      Story.message(
        FailedExportPng({ error: 'Canvas 2D context not available' }),
      ),
      Story.resolve(
        Ui.Dialog.ShowDialog,
        Ui.Dialog.CompletedShowDialog(),
        dialogMessage => GotErrorDialogMessage({ message: dialogMessage }),
      ),
      Story.model(model => {
        expect(model.maybeExportError).toEqual(
          Option.some('Canvas 2D context not available'),
        )
        expect(model.errorDialog.isOpen).toBe(true)
      }),
    )
  })

  test('dismissing error dialog clears error and closes dialog', () => {
    Story.story(
      update,
      Story.with(emptyModel),
      Story.message(
        FailedExportPng({ error: 'Canvas 2D context not available' }),
      ),
      Story.resolve(
        Ui.Dialog.ShowDialog,
        Ui.Dialog.CompletedShowDialog(),
        dialogMessage => GotErrorDialogMessage({ message: dialogMessage }),
      ),
      Story.message(DismissedErrorDialog()),
      Story.resolve(
        Ui.Dialog.CloseDialog,
        Ui.Dialog.CompletedCloseDialog(),
        dialogMessage => GotErrorDialogMessage({ message: dialogMessage }),
      ),
      Story.model(model => {
        expect(model.maybeExportError).toEqual(Option.none())
        expect(model.errorDialog.isOpen).toBe(false)
      }),
    )
  })
})
