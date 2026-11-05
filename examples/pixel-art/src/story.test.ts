import { Equal, Option } from 'effect'
import { Command, given, message, model, story } from 'foldkit/story'
import { messageFrom } from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'
import { Dialog } from '@foldkit/ui'

import { ExportPng, SaveCanvas } from './command'
import {
  GridSizeRadioGroupBlock,
  PaletteRadioGroupBlock,
  ThemeListboxBlock,
  ToolRadioGroupBlock,
} from './components'
import { ErrorDialogBinding } from './composition'
import { createEmptyGrid } from './grid'
import { ApplicationBlock, layer } from './index'
import { Message } from './message'
import { type Model, type PaletteIndex } from './model'

type DialogMessage = typeof Dialog.DialogBlock.Message.Type

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
  errorDialog: Dialog.DialogBlock.Model.make({
    id: 'export-error-dialog',
    isOpen: false,
    isAnimated: false,
    animation: {
      id: 'export-error-dialog' + '-panel',
      isShowing: false,
      transitionState: 'Idle',
      transitionGeneration: 0,
    },
    maybeFocusSelector: Option.none(),
  }),
  maybeExportError: Option.none(),
  paletteThemeIndex: 0,
  gridSizeConfirmDialog: Dialog.DialogBlock.Model.make({
    id: 'grid-size-confirm-dialog',
    isOpen: false,
    isAnimated: false,
    animation: {
      id: 'grid-size-confirm-dialog' + '-panel',
      isShowing: false,
      transitionState: 'Idle',
      transitionGeneration: 0,
    },
    maybeFocusSelector: Option.none(),
  }),
  maybePendingGridSize: Option.none(),
  themeListbox: ThemeListboxBlock.Model.make({
    id: 'theme-picker',
    isOpen: false,
    isAnimated: false,
    isModal: false,
    orientation: 'Vertical',
    animation: {
      id: 'theme-picker' + '-listbox',
      isShowing: false,
      transitionState: 'Idle',
      transitionGeneration: 0,
    },
    maybeActiveItemIndex: Option.none(),
    activationTrigger: 'Keyboard',
    searchQuery: '',
    searchVersion: 0,
    maybeLastPointerPosition: Option.none(),
    maybeLastButtonPointerType: Option.none(),
  }),
  toolRadioGroup: ToolRadioGroupBlock.Model.make({
    id: 'tool-picker',
    maybeFocusedIndex: Option.none(),
  }),
  gridSizeRadioGroup: GridSizeRadioGroupBlock.Model.make({
    id: 'grid-size-picker',
    maybeFocusedIndex: Option.none(),
  }),
  paletteRadioGroup: PaletteRadioGroupBlock.Model.make({
    id: 'palette-picker',
    maybeFocusedIndex: Option.none(),
  }),
}

const errorDialogMessage = (message: DialogMessage) =>
  messageFrom(ErrorDialogBinding, message)

describe('brush tool', () => {
  it.effect('painting a cell sets its color and pushes undo history', () =>
    story(
      { block: ApplicationBlock, layer },
      given(emptyModel),
      message(Message.PressedCell({ x: 1, y: 2 })),
      model(model => {
        expect(model.grid[2]?.[1]).toEqual(Option.some(0))
        expect(model.undoStack).toHaveLength(1)
        expect(model.redoStack).toHaveLength(0)
        expect(model.isDrawing).toBe(true)
      }),
    ),
  )

  it.effect('dragging paints multiple cells within a single undo entry', () =>
    story(
      { block: ApplicationBlock, layer },
      given(emptyModel),
      message(Message.PressedCell({ x: 0, y: 0 })),
      message(Message.EnteredCell({ x: 1, y: 0 })),
      message(Message.EnteredCell({ x: 2, y: 0 })),
      message(Message.ReleasedMouse()),
      Command.resolve(SaveCanvas, Message.CompletedSaveCanvas()),
      model(model => {
        expect(model.grid[0]?.[0]).toEqual(Option.some(0))
        expect(model.grid[0]?.[1]).toEqual(Option.some(0))
        expect(model.grid[0]?.[2]).toEqual(Option.some(0))
        expect(model.undoStack).toHaveLength(1)
        expect(model.isDrawing).toBe(false)
      }),
    ),
  )
})

describe('undo and redo', () => {
  it.effect('undo restores the previous grid state', () =>
    story(
      { block: ApplicationBlock, layer },
      given(emptyModel),
      message(Message.PressedCell({ x: 0, y: 0 })),
      message(Message.ReleasedMouse()),
      Command.resolve(SaveCanvas, Message.CompletedSaveCanvas()),
      model(model => {
        expect(model.grid[0]?.[0]).toEqual(Option.some(0))
        expect(model.undoStack).toHaveLength(1)
      }),
      message(Message.ClickedUndo()),
      Command.resolve(SaveCanvas, Message.CompletedSaveCanvas()),
      model(model => {
        expect(model.grid[0]?.[0]).toEqual(Option.none())
        expect(model.undoStack).toHaveLength(0)
        expect(model.redoStack).toHaveLength(1)
      }),
    ),
  )

  it.effect('redo re-applies the undone state', () =>
    story(
      { block: ApplicationBlock, layer },
      given(emptyModel),
      message(Message.PressedCell({ x: 0, y: 0 })),
      message(Message.ReleasedMouse()),
      Command.resolve(SaveCanvas, Message.CompletedSaveCanvas()),
      message(Message.ClickedUndo()),
      Command.resolve(SaveCanvas, Message.CompletedSaveCanvas()),
      message(Message.ClickedRedo()),
      Command.resolve(SaveCanvas, Message.CompletedSaveCanvas()),
      model(model => {
        expect(model.grid[0]?.[0]).toEqual(Option.some(0))
        expect(model.undoStack).toHaveLength(1)
        expect(model.redoStack).toHaveLength(0)
      }),
    ),
  )

  it.effect('new stroke after undo clears the redo stack', () =>
    story(
      { block: ApplicationBlock, layer },
      given(emptyModel),
      message(Message.PressedCell({ x: 0, y: 0 })),
      message(Message.ReleasedMouse()),
      Command.resolve(SaveCanvas, Message.CompletedSaveCanvas()),
      message(Message.ClickedUndo()),
      Command.resolve(SaveCanvas, Message.CompletedSaveCanvas()),
      model(model => {
        expect(model.redoStack).toHaveLength(1)
      }),
      message(Message.PressedCell({ x: 1, y: 1 })),
      message(Message.ReleasedMouse()),
      Command.resolve(SaveCanvas, Message.CompletedSaveCanvas()),
      model(model => {
        expect(model.redoStack).toHaveLength(0)
        expect(model.undoStack).toHaveLength(1)
      }),
    ),
  )

  it.effect('undo on empty stack is a no-op', () =>
    story(
      { block: ApplicationBlock, layer },
      given(emptyModel),
      message(Message.ClickedUndo()),
      model(model => {
        expect(model.grid).toEqual(emptyModel.grid)
        expect(model.undoStack).toHaveLength(0)
      }),
    ),
  )

  it.effect('redo on empty stack is a no-op', () =>
    story(
      { block: ApplicationBlock, layer },
      given(emptyModel),
      message(Message.ClickedRedo()),
      model(model => {
        expect(model.grid).toEqual(emptyModel.grid)
        expect(model.redoStack).toHaveLength(0)
      }),
    ),
  )

  it.effect('multiple undo steps walk back through history', () =>
    story(
      { block: ApplicationBlock, layer },
      given(emptyModel),
      message(Message.PressedCell({ x: 0, y: 0 })),
      message(Message.ReleasedMouse()),
      Command.resolve(SaveCanvas, Message.CompletedSaveCanvas()),
      message(Message.SelectedColor({ colorIndex: 1 })),
      Command.resolve(SaveCanvas, Message.CompletedSaveCanvas()),
      message(Message.PressedCell({ x: 1, y: 1 })),
      message(Message.ReleasedMouse()),
      Command.resolve(SaveCanvas, Message.CompletedSaveCanvas()),
      model(model => {
        expect(model.grid[0]?.[0]).toEqual(Option.some(0))
        expect(model.grid[1]?.[1]).toEqual(Option.some(1))
        expect(model.undoStack).toHaveLength(2)
      }),
      message(Message.ClickedUndo()),
      Command.resolve(SaveCanvas, Message.CompletedSaveCanvas()),
      model(model => {
        expect(model.grid[0]?.[0]).toEqual(Option.some(0))
        expect(model.grid[1]?.[1]).toEqual(Option.none())
      }),
      message(Message.ClickedUndo()),
      Command.resolve(SaveCanvas, Message.CompletedSaveCanvas()),
      model(model => {
        expect(model.grid[0]?.[0]).toEqual(Option.none())
        expect(model.grid[1]?.[1]).toEqual(Option.none())
      }),
    ),
  )
})

describe('mirror mode', () => {
  it.effect('horizontal mirror paints at mirrored x position', () =>
    story(
      { block: ApplicationBlock, layer },
      given(emptyModel),
      message(Message.ToggledMirrorHorizontal()),
      message(Message.PressedCell({ x: 0, y: 1 })),
      model(model => {
        expect(model.grid[1]?.[0]).toEqual(Option.some(0))
        expect(model.grid[1]?.[3]).toEqual(Option.some(0))
      }),
    ),
  )

  it.effect('vertical mirror paints at mirrored y position', () =>
    story(
      { block: ApplicationBlock, layer },
      given(emptyModel),
      message(Message.ToggledMirrorVertical()),
      message(Message.PressedCell({ x: 1, y: 0 })),
      model(model => {
        expect(model.grid[0]?.[1]).toEqual(Option.some(0))
        expect(model.grid[3]?.[1]).toEqual(Option.some(0))
      }),
    ),
  )

  it.effect('both mirrors paint at all four symmetric positions', () =>
    story(
      { block: ApplicationBlock, layer },
      given(emptyModel),
      message(Message.ToggledMirrorHorizontal()),
      message(Message.ToggledMirrorVertical()),
      message(Message.PressedCell({ x: 0, y: 0 })),
      model(model => {
        expect(model.grid[0]?.[0]).toEqual(Option.some(0))
        expect(model.grid[0]?.[3]).toEqual(Option.some(0))
        expect(model.grid[3]?.[0]).toEqual(Option.some(0))
        expect(model.grid[3]?.[3]).toEqual(Option.some(0))
        expect(model.grid[1]?.[1]).toEqual(Option.none())
      }),
    ),
  )
})

describe('fill tool', () => {
  it.effect('flood fill colors a contiguous region', () =>
    story(
      { block: ApplicationBlock, layer },
      given(emptyModel),
      message(Message.SelectedTool({ tool: 'Fill' })),
      message(Message.PressedCell({ x: 0, y: 0 })),
      Command.resolve(SaveCanvas, Message.CompletedSaveCanvas()),
      model(model => {
        const allPainted = model.grid.every(row =>
          row.every(cell => Equal.equals(cell, Option.some(0))),
        )
        expect(allPainted).toBe(true)
        expect(model.undoStack).toHaveLength(1)
      }),
    ),
  )

  it.effect('fill does not cross color boundaries', () => {
    const gridWithBarrier = createEmptyGrid(4).map(row =>
      row.map((cell, x) => (x === 2 ? Option.some<PaletteIndex>(1) : cell)),
    )
    const modelWithBarrier = modifyFields(emptyModel, {
      grid: () => gridWithBarrier,
    })

    return story(
      { block: ApplicationBlock, layer },
      given(modelWithBarrier),
      message(Message.SelectedTool({ tool: 'Fill' })),
      message(Message.PressedCell({ x: 0, y: 0 })),
      Command.resolve(SaveCanvas, Message.CompletedSaveCanvas()),
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
  it.effect('blank canvas resizes immediately without confirmation', () =>
    story(
      { block: ApplicationBlock, layer },
      given(emptyModel),
      message(Message.SelectedGridSize({ size: 8 })),
      model(model => {
        expect(model.gridSize).toBe(8)
        expect(model.grid).toHaveLength(8)
        expect(model.maybePendingGridSize).toEqual(Option.none())
        expect(model.gridSizeConfirmDialog.isOpen).toBe(false)
      }),
    ),
  )

  it.effect('painted canvas opens confirmation dialog', () => {
    const paintedModel: Model = modifyFields(emptyModel, {
      grid: () =>
        createEmptyGrid(4).map((row, y) =>
          row.map((cell, x) =>
            x === 0 && y === 0 ? Option.some<PaletteIndex>(0) : cell,
          ),
        ),
    })

    return story(
      { block: ApplicationBlock, layer },
      given(paintedModel),
      message(Message.SelectedGridSize({ size: 8 })),
      Command.resolve(
        Dialog.test.ShowDialog,
        Dialog.DialogBlock.Message.SucceededShowDialog(),
      ),
      model(model => {
        expect(model.maybePendingGridSize).toEqual(Option.some(8))
        expect(model.gridSizeConfirmDialog.isOpen).toBe(true)
        expect(model.gridSize).toBe(4)
      }),
    )
  })

  it.effect('confirming grid size change resets canvas and history', () => {
    const paintedModel: Model = modifyFields(emptyModel, {
      grid: () =>
        createEmptyGrid(4).map((row, y) =>
          row.map((cell, x) =>
            x === 0 && y === 0 ? Option.some<PaletteIndex>(0) : cell,
          ),
        ),
      undoStack: () => [createEmptyGrid(4)],
    })

    return story(
      { block: ApplicationBlock, layer },
      given(paintedModel),
      message(Message.SelectedGridSize({ size: 8 })),
      Command.resolve(
        Dialog.test.ShowDialog,
        Dialog.DialogBlock.Message.SucceededShowDialog(),
      ),
      message(Message.ConfirmedGridSizeChange()),
      Command.resolve(
        Dialog.test.CloseDialog,
        Dialog.DialogBlock.Message.CompletedCloseDialog(),
      ),
      Command.resolve(SaveCanvas, Message.CompletedSaveCanvas()),
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

  it.effect('selecting the same grid size is a no-op', () =>
    story(
      { block: ApplicationBlock, layer },
      given(emptyModel),
      message(Message.SelectedGridSize({ size: 4 })),
      model(model => {
        expect(model).toBe(emptyModel)
      }),
    ),
  )
})

describe('clear canvas', () => {
  it.effect('clear resets all cells and pushes undo history', () =>
    story(
      { block: ApplicationBlock, layer },
      given(emptyModel),
      message(Message.PressedCell({ x: 0, y: 0 })),
      message(Message.ReleasedMouse()),
      Command.resolve(SaveCanvas, Message.CompletedSaveCanvas()),
      message(Message.ClickedClear()),
      Command.resolve(SaveCanvas, Message.CompletedSaveCanvas()),
      model(model => {
        expect(model.grid[0]?.[0]).toEqual(Option.none())
        expect(model.undoStack).toHaveLength(2)
      }),
      message(Message.ClickedUndo()),
      Command.resolve(SaveCanvas, Message.CompletedSaveCanvas()),
      model(model => {
        expect(model.grid[0]?.[0]).toEqual(Option.some(0))
      }),
    ),
  )
})

describe('export', () => {
  it.effect('successful export resolves without changing Model', () =>
    story(
      { block: ApplicationBlock, layer },
      given(emptyModel),
      message(Message.ClickedExport()),
      Command.expectHas(ExportPng),
      Command.resolve(ExportPng, Message.SucceededExportPng()),
      model(model => {
        expect(model.grid).toEqual(emptyModel.grid)
        expect(model.maybeExportError).toEqual(Option.none())
      }),
      Command.expectNone(),
    ),
  )
})

describe('hover preview', () => {
  it.effect('entering a cell sets hover position', () =>
    story(
      { block: ApplicationBlock, layer },
      given(emptyModel),
      message(Message.EnteredCell({ x: 2, y: 3 })),
      model(model => {
        expect(model.maybeHoveredCell).toEqual(Option.some({ x: 2, y: 3 }))
      }),
    ),
  )

  it.effect('leaving canvas clears hover position', () =>
    story(
      { block: ApplicationBlock, layer },
      given(emptyModel),
      message(Message.EnteredCell({ x: 2, y: 3 })),
      message(Message.LeftCanvas()),
      model(model => {
        expect(model.maybeHoveredCell).toEqual(Option.none())
      }),
    ),
  )
})

describe('eraser tool', () => {
  it.effect('eraser removes color from a painted cell', () =>
    story(
      { block: ApplicationBlock, layer },
      given(emptyModel),
      message(Message.PressedCell({ x: 0, y: 0 })),
      message(Message.ReleasedMouse()),
      Command.resolve(SaveCanvas, Message.CompletedSaveCanvas()),
      model(model => {
        expect(model.grid[0]?.[0]).toEqual(Option.some(0))
      }),
      message(Message.SelectedTool({ tool: 'Eraser' })),
      message(Message.PressedCell({ x: 0, y: 0 })),
      message(Message.ReleasedMouse()),
      Command.resolve(SaveCanvas, Message.CompletedSaveCanvas()),
      model(model => {
        expect(model.grid[0]?.[0]).toEqual(Option.none())
        expect(model.undoStack).toHaveLength(2)
      }),
    ),
  )
})

describe('export failure', () => {
  it.effect('failed export sets error and opens error dialog', () =>
    story(
      { block: ApplicationBlock, layer },
      given(emptyModel),
      message(
        Message.FailedExportPng({ error: 'Canvas 2D context not available' }),
      ),
      Command.resolve(
        Dialog.test.ShowDialog,
        Dialog.DialogBlock.Message.SucceededShowDialog(),
      ),
      model(model => {
        expect(model.maybeExportError).toEqual(
          Option.some('Canvas 2D context not available'),
        )
        expect(model.errorDialog.isOpen).toBe(true)
      }),
    ),
  )

  it.effect('dismissing error dialog clears error and closes dialog', () =>
    story(
      { block: ApplicationBlock, layer },
      given(emptyModel),
      message(
        Message.FailedExportPng({ error: 'Canvas 2D context not available' }),
      ),
      Command.resolve(
        Dialog.test.ShowDialog,
        Dialog.DialogBlock.Message.SucceededShowDialog(),
      ),
      errorDialogMessage(Dialog.DialogBlock.Message.ClickedCloseButton()),
      Command.resolve(
        Dialog.test.CloseDialog,
        Dialog.DialogBlock.Message.CompletedCloseDialog(),
      ),
      model(model => {
        expect(model.maybeExportError).toEqual(Option.none())
        expect(model.errorDialog.isOpen).toBe(false)
      }),
    ),
  )
})
