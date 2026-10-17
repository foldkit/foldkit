import { Array, Match, Option } from 'effect'
import { Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { ExportPng, saveCanvas } from './command'
import {
  ApplicationComposition,
  ErrorDialogBinding,
  GridSizeConfirmDialogBinding,
  applyGridSizeChange,
  requestGridSizeChange,
  selectColor,
  selectTool,
} from './composition'
import {
  createEmptyGrid,
  erasePixels,
  floodFill,
  getMirroredPositions,
  pushHistory,
  setPixels,
} from './grid'
import { Message } from './message'
import { Model } from './model'

const applyEraser = (model: Model, x: number, y: number) => {
  const positions = getMirroredPositions(x, y, model.gridSize, model.mirrorMode)
  return erasePixels(model.grid, positions)
}

const applyBrush = (model: Model, x: number, y: number) => {
  const positions = getMirroredPositions(x, y, model.gridSize, model.mirrorMode)
  return setPixels(model.grid, positions, model.selectedColorIndex)
}

const applyFill = (model: Model, x: number, y: number) => {
  const positions = getMirroredPositions(x, y, model.gridSize, 'None')
  return Array.reduce(positions, model.grid, (currentGrid, [fillX, fillY]) =>
    floodFill(currentGrid, fillX, fillY, model.selectedColorIndex),
  )
}

export const update = ApplicationComposition.makeUpdate((model, message) =>
  Message.match(message, {
    PressedCell: ({ x, y }) =>
      Match.value(model.tool).pipe(
        Match.when('Brush', () => ({
          model: modifyFields(model, {
            grid: () => applyBrush(model, x, y),
            undoStack: () => pushHistory(model.undoStack, model.grid),
            redoStack: () => [],
            isDrawing: () => true,
          }),
        })),
        Match.when('Fill', () => {
          const nextModel = modifyFields(model, {
            grid: () => applyFill(model, x, y),
            undoStack: () => pushHistory(model.undoStack, model.grid),
            redoStack: () => [],
          })
          return { model: nextModel, commands: [saveCanvas(nextModel)] }
        }),
        Match.when('Eraser', () => ({
          model: modifyFields(model, {
            grid: () => applyEraser(model, x, y),
            undoStack: () => pushHistory(model.undoStack, model.grid),
            redoStack: () => [],
            isDrawing: () => true,
          }),
        })),
        Match.exhaustive,
      ),

    EnteredCell: ({ x, y }) => {
      const withHover = modifyFields(model, {
        maybeHoveredCell: () => Option.some({ x, y }),
      })

      if (model.isDrawing && model.tool === 'Brush') {
        return {
          model: modifyFields(withHover, {
            grid: () => applyBrush(model, x, y),
          }),
        }
      }

      if (model.isDrawing && model.tool === 'Eraser') {
        return {
          model: modifyFields(withHover, {
            grid: () => applyEraser(model, x, y),
          }),
        }
      }

      return { model: withHover }
    },

    LeftCanvas: () => ({
      model: modifyFields(model, { maybeHoveredCell: () => Option.none() }),
    }),

    ReleasedMouse: () => {
      if (!model.isDrawing) {
        return { model }
      }
      const nextModel = modifyFields(model, { isDrawing: () => false })
      return { model: nextModel, commands: [saveCanvas(nextModel)] }
    },

    SelectedColor: ({ colorIndex }) => selectColor(model, colorIndex),

    SelectedTool: ({ tool }) => selectTool(model, tool),

    SelectedGridSize: ({ size }) => requestGridSizeChange(size)(model),

    ToggledMirrorHorizontal: () => {
      const nextMirrorMode = Match.value(model.mirrorMode).pipe(
        Match.when('None', () => 'Horizontal' as const),
        Match.when('Horizontal', () => 'None' as const),
        Match.when('Vertical', () => 'Both' as const),
        Match.when('Both', () => 'Vertical' as const),
        Match.exhaustive,
      )
      return {
        model: modifyFields(model, { mirrorMode: () => nextMirrorMode }),
      }
    },

    ToggledMirrorVertical: () => {
      const nextMirrorMode = Match.value(model.mirrorMode).pipe(
        Match.when('None', () => 'Vertical' as const),
        Match.when('Vertical', () => 'None' as const),
        Match.when('Horizontal', () => 'Both' as const),
        Match.when('Both', () => 'Horizontal' as const),
        Match.exhaustive,
      )
      return {
        model: modifyFields(model, { mirrorMode: () => nextMirrorMode }),
      }
    },

    ClickedUndo: () =>
      Array.match(model.undoStack, {
        onEmpty: () => ({ model }),
        onNonEmpty: nonEmptyUndoStack => {
          const nextModel = modifyFields(model, {
            grid: () => Array.lastNonEmpty(nonEmptyUndoStack),
            undoStack: () => Array.initNonEmpty(nonEmptyUndoStack),
            redoStack: () => [...model.redoStack, model.grid],
          })
          return { model: nextModel, commands: [saveCanvas(nextModel)] }
        },
      }),

    ClickedRedo: () =>
      Array.match(model.redoStack, {
        onEmpty: () => ({ model }),
        onNonEmpty: nonEmptyRedoStack => {
          const nextModel = modifyFields(model, {
            grid: () => Array.lastNonEmpty(nonEmptyRedoStack),
            undoStack: () => [...model.undoStack, model.grid],
            redoStack: () => Array.initNonEmpty(nonEmptyRedoStack),
          })
          return { model: nextModel, commands: [saveCanvas(nextModel)] }
        },
      }),

    ClickedHistoryStep: ({ stepIndex }) => {
      const targetGrid = model.undoStack[stepIndex]
      if (targetGrid === undefined) {
        return { model }
      }

      const statesAfterTarget = Array.drop(model.undoStack, stepIndex + 1)

      const nextModel = modifyFields(model, {
        grid: () => targetGrid,
        undoStack: () => Array.take(model.undoStack, stepIndex),
        redoStack: () => [
          ...model.redoStack,
          model.grid,
          ...Array.reverse(statesAfterTarget),
        ],
      })

      return { model: nextModel, commands: [saveCanvas(nextModel)] }
    },

    ClickedRedoStep: ({ stepIndex }) => {
      const targetGrid = model.redoStack[stepIndex]
      if (targetGrid === undefined) {
        return { model }
      }

      const statesBetweenCurrentAndTarget = Array.drop(
        model.redoStack,
        stepIndex + 1,
      )

      const nextModel = modifyFields(model, {
        grid: () => targetGrid,
        undoStack: () => [
          ...model.undoStack,
          model.grid,
          ...Array.reverse(statesBetweenCurrentAndTarget),
        ],
        redoStack: () => Array.take(model.redoStack, stepIndex),
      })

      return { model: nextModel, commands: [saveCanvas(nextModel)] }
    },

    ClickedClear: () => {
      const nextModel = modifyFields(model, {
        grid: () => createEmptyGrid(model.gridSize),
        undoStack: () => pushHistory(model.undoStack, model.grid),
        redoStack: () => [],
      })
      return { model: nextModel, commands: [saveCanvas(nextModel)] }
    },

    ClickedExport: () => ({
      model,
      commands: [
        ExportPng({
          grid: model.grid,
          gridSize: model.gridSize,
          paletteThemeIndex: model.paletteThemeIndex,
        }),
      ],
    }),

    SucceededExportPng: () => ({ model }),

    CompletedSaveCanvas: () => ({ model }),

    FailedExportPng: ({ error }) =>
      Update.combine(model, [
        stepModel => ({
          model: modifyFields(stepModel, {
            maybeExportError: () => Option.some(error),
          }),
        }),
        ErrorDialogBinding.open(),
      ]),

    ConfirmedGridSizeChange: () =>
      Option.match(model.maybePendingGridSize, {
        onNone: () => ({ model }),
        onSome: pendingSize =>
          Update.combine(model, [
            stepModel => applyGridSizeChange(stepModel, pendingSize),
            GridSizeConfirmDialogBinding.close(),
            stepModel => ({
              model: stepModel,
              commands: [saveCanvas(stepModel)],
            }),
          ]),
      }),
  }),
)
