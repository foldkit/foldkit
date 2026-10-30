import { Equal, Option } from 'effect'
import { Block } from 'foldkit'
import type { Resolved } from 'foldkit/block'
import { Command, given, message, model, story } from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'

import { describe, expect, it } from '@effect/vitest'
import { Dialog } from '@foldkit/ui'

import { ExportPng, Message, type Model, SaveCanvas } from './application'
import { type PaletteIndex, createEmptyGrid } from './domain/grid'
import { GridSizeConfirmDialog } from './gridSizeConfirmDialog'
import { Header } from './header'
import { application, startArgs, withInitialModel } from './model.fixture'
import { Toolbar } from './toolbar'

type DialogMessage = typeof Dialog.Dialog.Message.Type

const errorDialogMessage = (message: DialogMessage) =>
  Block.deliver(Dialog.Dialog, ['errorDialog', 'dialog'], message)

const toolbarMessage = (message: typeof Toolbar.Message.Type) =>
  Block.deliver(Toolbar, 'toolbar', message)

const gridSizeConfirmDialogMessage = (
  message: typeof GridSizeConfirmDialog.Message.Type,
) => Block.deliver(GridSizeConfirmDialog, 'gridSizeConfirmDialog', message)

describe('brush tool', () => {
  it.effect('painting a cell sets its color and pushes undo history', () =>
    story(
      application,
      startArgs,
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
      application,
      startArgs,
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
      application,
      startArgs,
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
      application,
      startArgs,
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
      application,
      startArgs,
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
    withInitialModel(emptyModel =>
      story(
        application,
        startArgs,
        message(Message.ClickedUndo()),
        model(model => {
          expect(model.grid).toEqual(emptyModel.grid)
          expect(model.undoStack).toHaveLength(0)
        }),
      ),
    ),
  )

  it.effect('redo on empty stack is a no-op', () =>
    withInitialModel(emptyModel =>
      story(
        application,
        startArgs,
        message(Message.ClickedRedo()),
        model(model => {
          expect(model.grid).toEqual(emptyModel.grid)
          expect(model.redoStack).toHaveLength(0)
        }),
      ),
    ),
  )

  it.effect('multiple undo steps walk back through history', () =>
    story(
      application,
      startArgs,
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
      application,
      startArgs,
      message(toolbarMessage(Toolbar.Message.ToggledMirrorHorizontal())),
      message(Message.PressedCell({ x: 0, y: 1 })),
      model(model => {
        expect(model.grid[1]?.[0]).toEqual(Option.some(0))
        expect(model.grid[1]?.[3]).toEqual(Option.some(0))
      }),
    ),
  )

  it.effect('vertical mirror paints at mirrored y position', () =>
    story(
      application,
      startArgs,
      message(toolbarMessage(Toolbar.Message.ToggledMirrorVertical())),
      message(Message.PressedCell({ x: 1, y: 0 })),
      model(model => {
        expect(model.grid[0]?.[1]).toEqual(Option.some(0))
        expect(model.grid[3]?.[1]).toEqual(Option.some(0))
      }),
    ),
  )

  it.effect('both mirrors paint at all four symmetric positions', () =>
    story(
      application,
      startArgs,
      message(toolbarMessage(Toolbar.Message.ToggledMirrorHorizontal())),
      message(toolbarMessage(Toolbar.Message.ToggledMirrorVertical())),
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
      application,
      startArgs,
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

  it.effect('fill does not cross color boundaries', () =>
    withInitialModel(emptyModel => {
      const gridWithBarrier = createEmptyGrid(4).map(row =>
        row.map((cell, x) => (x === 2 ? Option.some<PaletteIndex>(1) : cell)),
      )
      const modelWithBarrier = modifyFields(emptyModel, {
        grid: () => gridWithBarrier,
      })

      return story(
        application,
        startArgs,
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
    }),
  )
})

describe('grid size', () => {
  it.effect('blank canvas resizes immediately without confirmation', () =>
    story(
      application,
      startArgs,
      message(Message.SelectedGridSize({ size: 8 })),
      model(model => {
        expect(model.gridSize).toBe(8)
        expect(model.grid).toHaveLength(8)
        expect(model.gridSizeConfirmDialog.maybePendingGridSize).toEqual(
          Option.none(),
        )
        expect(model.gridSizeConfirmDialog.dialog.isOpen).toBe(false)
      }),
    ),
  )

  it.effect('painted canvas opens confirmation dialog', () =>
    withInitialModel(emptyModel => {
      const paintedModel: Resolved<Model> = modifyFields(emptyModel, {
        grid: () =>
          createEmptyGrid(4).map((row, y) =>
            row.map((cell, x) =>
              x === 0 && y === 0 ? Option.some<PaletteIndex>(0) : cell,
            ),
          ),
      })

      return story(
        application,
        startArgs,
        given(paintedModel),
        message(Message.SelectedGridSize({ size: 8 })),
        Command.resolve(
          Dialog.test.ShowDialog,
          Dialog.Dialog.Message.SucceededShowDialog(),
        ),
        model(model => {
          expect(model.gridSizeConfirmDialog.maybePendingGridSize).toEqual(
            Option.some(8),
          )
          expect(model.gridSizeConfirmDialog.dialog.isOpen).toBe(true)
          expect(model.gridSize).toBe(4)
        }),
      )
    }),
  )

  it.effect('confirming grid size change resets canvas and history', () =>
    withInitialModel(emptyModel => {
      const paintedModel: Resolved<Model> = modifyFields(emptyModel, {
        grid: () =>
          createEmptyGrid(4).map((row, y) =>
            row.map((cell, x) =>
              x === 0 && y === 0 ? Option.some<PaletteIndex>(0) : cell,
            ),
          ),
        undoStack: () => [createEmptyGrid(4)],
      })

      return story(
        application,
        startArgs,
        given(paintedModel),
        message(Message.SelectedGridSize({ size: 8 })),
        Command.resolve(
          Dialog.test.ShowDialog,
          Dialog.Dialog.Message.SucceededShowDialog(),
        ),
        message(
          gridSizeConfirmDialogMessage(
            GridSizeConfirmDialog.Message.ConfirmedGridSizeChange(),
          ),
        ),
        Command.resolve(
          Dialog.test.CloseDialog,
          Dialog.Dialog.Message.CompletedCloseDialog(),
        ),
        Command.resolve(SaveCanvas, Message.CompletedSaveCanvas()),
        model(model => {
          expect(model.gridSize).toBe(8)
          expect(model.grid).toHaveLength(8)
          expect(model.grid[0]).toHaveLength(8)
          expect(model.undoStack).toHaveLength(0)
          expect(model.redoStack).toHaveLength(0)
          expect(model.gridSizeConfirmDialog.maybePendingGridSize).toEqual(
            Option.none(),
          )
        }),
      )
    }),
  )

  it.effect('selecting the same grid size is a no-op', () =>
    withInitialModel(emptyModel =>
      story(
        application,
        startArgs,
        message(Message.SelectedGridSize({ size: 4 })),
        model(model => {
          expect(model).toStrictEqual(emptyModel)
        }),
      ),
    ),
  )
})

describe('clear canvas', () => {
  it.effect('clear resets all cells and pushes undo history', () =>
    story(
      application,
      startArgs,
      message(Message.PressedCell({ x: 0, y: 0 })),
      message(Message.ReleasedMouse()),
      Command.resolve(SaveCanvas, Message.CompletedSaveCanvas()),
      message(toolbarMessage(Toolbar.Message.ClickedClear())),
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
    withInitialModel(emptyModel =>
      story(
        application,
        startArgs,
        message(
          Block.deliver(Header, 'header', Header.Message.ClickedExport()),
        ),
        Command.expectHas(ExportPng),
        Command.resolve(ExportPng, Message.SucceededExportPng()),
        model(model => {
          expect(model.grid).toEqual(emptyModel.grid)
          expect(model.errorDialog.maybeExportError).toEqual(Option.none())
        }),
        Command.expectNone(),
      ),
    ),
  )
})

describe('hover preview', () => {
  it.effect('entering a cell sets hover position', () =>
    story(
      application,
      startArgs,
      message(Message.EnteredCell({ x: 2, y: 3 })),
      model(model => {
        expect(model.maybeHoveredCell).toEqual(Option.some({ x: 2, y: 3 }))
      }),
    ),
  )

  it.effect('leaving canvas clears hover position', () =>
    story(
      application,
      startArgs,
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
      application,
      startArgs,
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
      application,
      startArgs,
      message(
        Message.FailedExportPng({ error: 'Canvas 2D context not available' }),
      ),
      Command.resolve(
        Dialog.test.ShowDialog,
        Dialog.Dialog.Message.SucceededShowDialog(),
      ),
      model(model => {
        expect(model.errorDialog.maybeExportError).toEqual(
          Option.some('Canvas 2D context not available'),
        )
        expect(model.errorDialog.dialog.isOpen).toBe(true)
      }),
    ),
  )

  it.effect('dismissing error dialog clears error and closes dialog', () =>
    story(
      application,
      startArgs,
      message(
        Message.FailedExportPng({ error: 'Canvas 2D context not available' }),
      ),
      Command.resolve(
        Dialog.test.ShowDialog,
        Dialog.Dialog.Message.SucceededShowDialog(),
      ),
      message(errorDialogMessage(Dialog.Dialog.Message.RequestedClose())),
      Command.resolve(
        Dialog.test.CloseDialog,
        Dialog.Dialog.Message.CompletedCloseDialog(),
      ),
      model(model => {
        expect(model.errorDialog.maybeExportError).toEqual(Option.none())
        expect(model.errorDialog.dialog.isOpen).toBe(false)
      }),
    ),
  )
})
