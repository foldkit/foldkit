import { Array, Match, Option } from 'effect'
import { Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { makeCommandsStep, makeFieldsStep, makeNoopStep } from './block'
import { ExportPng, saveCanvas } from './command'
import {
  ApplicationComposition,
  ErrorDialogBinding,
  GridSizeConfirmDialogBinding,
} from './composition'
import {
  createEmptyGrid,
  erasePixels,
  floodFill,
  getMirroredPositions,
  pushHistory,
  setPixels,
} from './grid'
import { type MirrorMode, Model } from './model'
import {
  applyGridSizeChange,
  changeGridSize,
  selectColor,
  selectTool,
} from './steps'

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

export const update = ApplicationComposition.makeUpdate({
  PressedCell: (model, { x, y }) =>
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

  EnteredCell: makeFieldsStep((model, { x, y }) => {
    const maybeHoveredCell = () => Option.some({ x, y })

    if (model.isDrawing && model.tool === 'Brush') {
      return {
        maybeHoveredCell,
        grid: () => applyBrush(model, x, y),
      }
    }

    if (model.isDrawing && model.tool === 'Eraser') {
      return {
        maybeHoveredCell,
        grid: () => applyEraser(model, x, y),
      }
    }

    return { maybeHoveredCell }
  }),

  LeftCanvas: makeFieldsStep(() => ({
    maybeHoveredCell: () => Option.none(),
  })),

  ReleasedMouse: model => {
    if (!model.isDrawing) {
      return { model }
    }
    const nextModel = modifyFields(model, { isDrawing: () => false })
    return { model: nextModel, commands: [saveCanvas(nextModel)] }
  },

  SelectedColor: (model, { colorIndex }) => selectColor(colorIndex)(model),

  SelectedTool: (model, { tool }) => selectTool(tool)(model),

  SelectedGridSize: (model, { size }) => changeGridSize(size)(model),

  ToggledMirrorHorizontal: makeFieldsStep(model => {
    const nextMirrorMode = Match.value(model.mirrorMode).pipe(
      Match.withReturnType<MirrorMode>(),
      Match.when('None', () => 'Horizontal'),
      Match.when('Horizontal', () => 'None'),
      Match.when('Vertical', () => 'Both'),
      Match.when('Both', () => 'Vertical'),
      Match.exhaustive,
    )
    return { mirrorMode: () => nextMirrorMode }
  }),

  ToggledMirrorVertical: makeFieldsStep(model => {
    const nextMirrorMode = Match.value(model.mirrorMode).pipe(
      Match.withReturnType<MirrorMode>(),
      Match.when('None', () => 'Vertical'),
      Match.when('Vertical', () => 'None'),
      Match.when('Horizontal', () => 'Both'),
      Match.when('Both', () => 'Horizontal'),
      Match.exhaustive,
    )
    return { mirrorMode: () => nextMirrorMode }
  }),

  ClickedUndo: model =>
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

  ClickedRedo: model =>
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

  ClickedHistoryStep: (model, { stepIndex }) => {
    const maybeTargetGrid = Array.get(model.undoStack, stepIndex)
    if (Option.isNone(maybeTargetGrid)) {
      return { model }
    }

    const targetGrid = maybeTargetGrid.value

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

  ClickedRedoStep: (model, { stepIndex }) => {
    const maybeTargetGrid = Array.get(model.redoStack, stepIndex)
    if (Option.isNone(maybeTargetGrid)) {
      return { model }
    }

    const targetGrid = maybeTargetGrid.value

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

  ClickedClear: model => {
    const nextModel = modifyFields(model, {
      grid: () => createEmptyGrid(model.gridSize),
      undoStack: () => pushHistory(model.undoStack, model.grid),
      redoStack: () => [],
    })
    return { model: nextModel, commands: [saveCanvas(nextModel)] }
  },

  ClickedExport: makeCommandsStep(model => [
    ExportPng({
      grid: model.grid,
      gridSize: model.gridSize,
      paletteThemeIndex: model.paletteThemeIndex,
    }),
  ]),

  SucceededExportPng: makeNoopStep(),

  CompletedSaveCanvas: makeNoopStep(),

  FailedExportPng: (model, { error }) =>
    Update.combineSteps(model, [
      makeFieldsStep(() => ({
        maybeExportError: () => Option.some(error),
      })),
      ErrorDialogBinding.requestOpen(),
    ]),

  ConfirmedGridSizeChange: model =>
    Option.match(model.maybePendingGridSize, {
      onNone: () => makeNoopStep()(model),
      onSome: pendingSize =>
        Update.combineSteps(model, [
          applyGridSizeChange(pendingSize),
          GridSizeConfirmDialogBinding.requestClose(),
          makeCommandsStep(stepModel => [saveCanvas(stepModel)]),
        ]),
    }),
})
