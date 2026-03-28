import { Equal, Option } from 'effect'
import { Test, Ui } from 'foldkit'
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
  EnteredCell,
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
    Test.story(
      update,
      Test.with(emptyModel),
      Test.message(PressedCell({ x: 1, y: 2 })),
      Test.tap(({ model }) => {
        expect(model.grid[2]?.[1]).toEqual(Option.some(0))
        expect(model.undoStack).toHaveLength(1)
        expect(model.redoStack).toHaveLength(0)
        expect(model.isDrawing).toBe(true)
      }),
    )
  })

  test('dragging paints multiple cells within a single undo entry', () => {
    Test.story(
      update,
      Test.with(emptyModel),
      Test.message(PressedCell({ x: 0, y: 0 })),
      Test.message(EnteredCell({ x: 1, y: 0 })),
      Test.message(EnteredCell({ x: 2, y: 0 })),
      Test.message(ReleasedMouse()),
      Test.resolve(SaveCanvas, CompletedSaveCanvas()),
      Test.tap(({ model }) => {
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
    Test.story(
      update,
      Test.with(emptyModel),
      Test.message(PressedCell({ x: 0, y: 0 })),
      Test.message(ReleasedMouse()),
      Test.resolve(SaveCanvas, CompletedSaveCanvas()),
      Test.tap(({ model }) => {
        expect(model.grid[0]?.[0]).toEqual(Option.some(0))
        expect(model.undoStack).toHaveLength(1)
      }),
      Test.message(ClickedUndo()),
      Test.resolve(SaveCanvas, CompletedSaveCanvas()),
      Test.tap(({ model }) => {
        expect(model.grid[0]?.[0]).toEqual(Option.none())
        expect(model.undoStack).toHaveLength(0)
        expect(model.redoStack).toHaveLength(1)
      }),
    )
  })

  test('redo re-applies the undone state', () => {
    Test.story(
      update,
      Test.with(emptyModel),
      Test.message(PressedCell({ x: 0, y: 0 })),
      Test.message(ReleasedMouse()),
      Test.resolve(SaveCanvas, CompletedSaveCanvas()),
      Test.message(ClickedUndo()),
      Test.resolve(SaveCanvas, CompletedSaveCanvas()),
      Test.message(ClickedRedo()),
      Test.resolve(SaveCanvas, CompletedSaveCanvas()),
      Test.tap(({ model }) => {
        expect(model.grid[0]?.[0]).toEqual(Option.some(0))
        expect(model.undoStack).toHaveLength(1)
        expect(model.redoStack).toHaveLength(0)
      }),
    )
  })

  test('new stroke after undo clears the redo stack', () => {
    Test.story(
      update,
      Test.with(emptyModel),
      Test.message(PressedCell({ x: 0, y: 0 })),
      Test.message(ReleasedMouse()),
      Test.resolve(SaveCanvas, CompletedSaveCanvas()),
      Test.message(ClickedUndo()),
      Test.resolve(SaveCanvas, CompletedSaveCanvas()),
      Test.tap(({ model }) => {
        expect(model.redoStack).toHaveLength(1)
      }),
      Test.message(PressedCell({ x: 1, y: 1 })),
      Test.message(ReleasedMouse()),
      Test.resolve(SaveCanvas, CompletedSaveCanvas()),
      Test.tap(({ model }) => {
        expect(model.redoStack).toHaveLength(0)
        expect(model.undoStack).toHaveLength(1)
      }),
    )
  })

  test('undo on empty stack is a no-op', () => {
    Test.story(
      update,
      Test.with(emptyModel),
      Test.message(ClickedUndo()),
      Test.tap(({ model }) => {
        expect(model.grid).toEqual(emptyModel.grid)
        expect(model.undoStack).toHaveLength(0)
      }),
    )
  })

  test('redo on empty stack is a no-op', () => {
    Test.story(
      update,
      Test.with(emptyModel),
      Test.message(ClickedRedo()),
      Test.tap(({ model }) => {
        expect(model.grid).toEqual(emptyModel.grid)
        expect(model.redoStack).toHaveLength(0)
      }),
    )
  })

  test('multiple undo steps walk back through history', () => {
    Test.story(
      update,
      Test.with(emptyModel),
      Test.message(PressedCell({ x: 0, y: 0 })),
      Test.message(ReleasedMouse()),
      Test.resolve(SaveCanvas, CompletedSaveCanvas()),
      Test.message(SelectedColor({ colorIndex: 1 })),
      Test.resolve(
        Ui.RadioGroup.FocusOption,
        Ui.RadioGroup.CompletedFocusOption(),
        radioMessage => GotPaletteRadioGroupMessage({ message: radioMessage }),
      ),
      Test.resolve(SaveCanvas, CompletedSaveCanvas()),
      Test.message(PressedCell({ x: 1, y: 1 })),
      Test.message(ReleasedMouse()),
      Test.resolve(SaveCanvas, CompletedSaveCanvas()),
      Test.tap(({ model }) => {
        expect(model.grid[0]?.[0]).toEqual(Option.some(0))
        expect(model.grid[1]?.[1]).toEqual(Option.some(1))
        expect(model.undoStack).toHaveLength(2)
      }),
      Test.message(ClickedUndo()),
      Test.resolve(SaveCanvas, CompletedSaveCanvas()),
      Test.tap(({ model }) => {
        expect(model.grid[0]?.[0]).toEqual(Option.some(0))
        expect(model.grid[1]?.[1]).toEqual(Option.none())
      }),
      Test.message(ClickedUndo()),
      Test.resolve(SaveCanvas, CompletedSaveCanvas()),
      Test.tap(({ model }) => {
        expect(model.grid[0]?.[0]).toEqual(Option.none())
        expect(model.grid[1]?.[1]).toEqual(Option.none())
      }),
    )
  })
})

describe('mirror mode', () => {
  test('horizontal mirror paints at mirrored x position', () => {
    Test.story(
      update,
      Test.with(emptyModel),
      Test.message(ToggledMirrorHorizontal()),
      Test.message(PressedCell({ x: 0, y: 1 })),
      Test.tap(({ model }) => {
        expect(model.grid[1]?.[0]).toEqual(Option.some(0))
        expect(model.grid[1]?.[3]).toEqual(Option.some(0))
      }),
    )
  })

  test('vertical mirror paints at mirrored y position', () => {
    Test.story(
      update,
      Test.with(emptyModel),
      Test.message(ToggledMirrorVertical()),
      Test.message(PressedCell({ x: 1, y: 0 })),
      Test.tap(({ model }) => {
        expect(model.grid[0]?.[1]).toEqual(Option.some(0))
        expect(model.grid[3]?.[1]).toEqual(Option.some(0))
      }),
    )
  })

  test('both mirrors paint at all four symmetric positions', () => {
    Test.story(
      update,
      Test.with(emptyModel),
      Test.message(ToggledMirrorHorizontal()),
      Test.message(ToggledMirrorVertical()),
      Test.message(PressedCell({ x: 0, y: 0 })),
      Test.tap(({ model }) => {
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
    Test.story(
      update,
      Test.with(emptyModel),
      Test.message(SelectedTool({ tool: 'Fill' })),
      Test.resolve(
        Ui.RadioGroup.FocusOption,
        Ui.RadioGroup.CompletedFocusOption(),
        radioMessage => GotToolRadioGroupMessage({ message: radioMessage }),
      ),
      Test.message(PressedCell({ x: 0, y: 0 })),
      Test.resolve(SaveCanvas, CompletedSaveCanvas()),
      Test.tap(({ model }) => {
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

    Test.story(
      update,
      Test.with(modelWithBarrier),
      Test.message(SelectedTool({ tool: 'Fill' })),
      Test.resolve(
        Ui.RadioGroup.FocusOption,
        Ui.RadioGroup.CompletedFocusOption(),
        radioMessage => GotToolRadioGroupMessage({ message: radioMessage }),
      ),
      Test.message(PressedCell({ x: 0, y: 0 })),
      Test.resolve(SaveCanvas, CompletedSaveCanvas()),
      Test.tap(({ model }) => {
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
    Test.story(
      update,
      Test.with(emptyModel),
      Test.message(SelectedGridSize({ size: 8 })),
      Test.resolve(
        Ui.RadioGroup.FocusOption,
        Ui.RadioGroup.CompletedFocusOption(),
        radioMessage => GotGridSizeRadioGroupMessage({ message: radioMessage }),
      ),
      Test.tap(({ model }) => {
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

    Test.story(
      update,
      Test.with(paintedModel),
      Test.message(SelectedGridSize({ size: 8 })),
      Test.resolve(
        Ui.Dialog.ShowDialog,
        Ui.Dialog.CompletedShowDialog(),
        dialogMessage =>
          GotGridSizeConfirmDialogMessage({ message: dialogMessage }),
      ),
      Test.tap(({ model }) => {
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

    Test.story(
      update,
      Test.with(modelWithPending),
      Test.message(ConfirmedGridSizeChange()),
      Test.resolve(
        Ui.Dialog.CloseDialog,
        Ui.Dialog.CompletedCloseDialog(),
        dialogMessage =>
          GotGridSizeConfirmDialogMessage({ message: dialogMessage }),
      ),
      Test.resolve(SaveCanvas, CompletedSaveCanvas()),
      Test.tap(({ model }) => {
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
    Test.story(
      update,
      Test.with(emptyModel),
      Test.message(SelectedGridSize({ size: 4 })),
      Test.tap(({ model }) => {
        expect(model).toBe(emptyModel)
      }),
    )
  })
})

describe('clear canvas', () => {
  test('clear resets all cells and pushes undo history', () => {
    Test.story(
      update,
      Test.with(emptyModel),
      Test.message(PressedCell({ x: 0, y: 0 })),
      Test.message(ReleasedMouse()),
      Test.resolve(SaveCanvas, CompletedSaveCanvas()),
      Test.message(ClickedClear()),
      Test.resolve(SaveCanvas, CompletedSaveCanvas()),
      Test.tap(({ model }) => {
        expect(model.grid[0]?.[0]).toEqual(Option.none())
        expect(model.undoStack).toHaveLength(2)
      }),
      Test.message(ClickedUndo()),
      Test.resolve(SaveCanvas, CompletedSaveCanvas()),
      Test.tap(({ model }) => {
        expect(model.grid[0]?.[0]).toEqual(Option.some(0))
      }),
    )
  })
})

describe('export', () => {
  test('successful export resolves without changing Model', () => {
    Test.story(
      update,
      Test.with(emptyModel),
      Test.message(ClickedExport()),
      Test.tap(({ commands }) => {
        expect(commands).toHaveLength(1)
        expect(commands[0]?.name).toBe(ExportPng.name)
      }),
      Test.resolve(ExportPng, SucceededExportPng()),
      Test.tap(({ model, commands }) => {
        expect(commands).toHaveLength(0)
        expect(model.grid).toEqual(emptyModel.grid)
        expect(model.maybeExportError).toEqual(Option.none())
      }),
    )
  })
})

describe('hover preview', () => {
  test('entering a cell sets hover position', () => {
    Test.story(
      update,
      Test.with(emptyModel),
      Test.message(EnteredCell({ x: 2, y: 3 })),
      Test.tap(({ model }) => {
        expect(model.maybeHoveredCell).toEqual(Option.some({ x: 2, y: 3 }))
      }),
    )
  })

  test('leaving canvas clears hover position', () => {
    Test.story(
      update,
      Test.with(emptyModel),
      Test.message(EnteredCell({ x: 2, y: 3 })),
      Test.message(LeftCanvas()),
      Test.tap(({ model }) => {
        expect(model.maybeHoveredCell).toEqual(Option.none())
      }),
    )
  })
})
