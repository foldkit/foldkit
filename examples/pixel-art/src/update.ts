import { Array, Match, Option } from 'effect'
import { Update } from 'foldkit'
import { evo } from 'foldkit/struct'

import { Dialog, Listbox, RadioGroup } from '@foldkit/ui'

import { ExportPng, saveCanvas } from './command'
import { DEFAULT_COLOR_INDEX } from './constant'
import {
  createEmptyGrid,
  erasePixels,
  floodFill,
  getMirroredPositions,
  isGridEmpty,
  pushHistory,
  setPixels,
} from './grid'
import { Message } from './message'
import {
  type Model,
  type PaletteIndex,
  type Tool,
  paletteIndexFromValue,
} from './model'
import { PALETTE_THEMES } from './palette'
import {
  GridSizeRadioGroup,
  PaletteRadioGroup,
  ThemeListbox,
  ToolRadioGroup,
} from './view/toolbar'

type UpdateReturn = Update.Return<Model, Message>

const withUpdateReturn = Match.withReturnType<UpdateReturn>()

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

const foldErrorDialogOutMessage = Dialog.OutMessage.match<
  Update.Step<Model, Message>
>({
  Opened: () => model => ({ model }),
  Closed: () => model => ({
    model: evo(model, { maybeExportError: () => Option.none() }),
  }),
})

const foldErrorDialog = Update.foldChild({
  update: Dialog.update,
  read: (model: Model) => Option.some(model.errorDialog),
  write: (model, nextErrorDialog) =>
    evo(model, { errorDialog: () => nextErrorDialog }),
  toParentMessage: message => Message.GotErrorDialogMessage({ message }),
  foldOutMessage: foldErrorDialogOutMessage,
})

const foldErrorDialogOpen = Update.foldChildStep({
  update: Dialog.open,
  read: (model: Model) => Option.some(model.errorDialog),
  write: (model, nextErrorDialog) =>
    evo(model, { errorDialog: () => nextErrorDialog }),
  toParentMessage: message => Message.GotErrorDialogMessage({ message }),
  foldOutMessage: foldErrorDialogOutMessage,
})

const foldThemeListboxOutMessage = Listbox.OutMessage.match<
  Update.Step<Model, Message>
>({
  Selected:
    ({ value }) =>
    model => {
      const themeIndex = Number(value)
      const maybeNextTheme = Array.get(PALETTE_THEMES, themeIndex)
      if (Option.isNone(maybeNextTheme)) {
        return { model }
      }
      const nextModel = evo(model, {
        paletteThemeIndex: () => themeIndex,
        selectedColorIndex: () => DEFAULT_COLOR_INDEX,
      })
      return { model: nextModel, commands: [saveCanvas(nextModel)] }
    },
})

const foldThemeListbox = Update.foldChild({
  update: ThemeListbox.update,
  read: (model: Model) => Option.some(model.themeListbox),
  write: (model, nextThemeListbox) =>
    evo(model, { themeListbox: () => nextThemeListbox }),
  toParentMessage: message => Message.GotThemeListboxMessage({ message }),
  foldOutMessage: foldThemeListboxOutMessage,
})

const foldGridSizeConfirmDialogOutMessage = Dialog.OutMessage.match<
  Update.Step<Model, Message>
>({
  Opened: () => model => ({ model }),
  Closed: () => model => ({
    model: evo(model, { maybePendingGridSize: () => Option.none() }),
  }),
})

const foldGridSizeConfirmDialog = Update.foldChild({
  update: Dialog.update,
  read: (model: Model) => Option.some(model.gridSizeConfirmDialog),
  write: (model, nextGridSizeConfirmDialog) =>
    evo(model, { gridSizeConfirmDialog: () => nextGridSizeConfirmDialog }),
  toParentMessage: message =>
    Message.GotGridSizeConfirmDialogMessage({ message }),
  foldOutMessage: foldGridSizeConfirmDialogOutMessage,
})

const foldGridSizeConfirmDialogOpen = Update.foldChildStep({
  update: Dialog.open,
  read: (model: Model) => Option.some(model.gridSizeConfirmDialog),
  write: (model, nextGridSizeConfirmDialog) =>
    evo(model, { gridSizeConfirmDialog: () => nextGridSizeConfirmDialog }),
  toParentMessage: message =>
    Message.GotGridSizeConfirmDialogMessage({ message }),
  foldOutMessage: foldGridSizeConfirmDialogOutMessage,
})

const foldGridSizeConfirmDialogClose = Update.foldChildStep({
  update: Dialog.close,
  read: (model: Model) => Option.some(model.gridSizeConfirmDialog),
  write: (model, nextGridSizeConfirmDialog) =>
    evo(model, { gridSizeConfirmDialog: () => nextGridSizeConfirmDialog }),
  toParentMessage: message =>
    Message.GotGridSizeConfirmDialogMessage({ message }),
  foldOutMessage: foldGridSizeConfirmDialogOutMessage,
})

const selectTool = (model: Model, tool: Tool): UpdateReturn => ({
  model: evo(model, { tool: () => tool }),
})

const selectColor = (model: Model, colorIndex: PaletteIndex): UpdateReturn => {
  const nextModel = evo(model, { selectedColorIndex: () => colorIndex })
  return { model: nextModel, commands: [saveCanvas(nextModel)] }
}

const foldToolRadioGroupOutMessage = RadioGroup.OutMessage.match<
  Update.Step<Model, Message>,
  RadioGroup.OutMessage<Tool>
>({
  Selected:
    ({ value }) =>
    model =>
      selectTool(model, value),
})

const foldToolRadioGroup = Update.foldChild({
  update: ToolRadioGroup.update,
  read: (model: Model) => Option.some(model.toolRadioGroup),
  write: (model, nextToolRadioGroup) =>
    evo(model, { toolRadioGroup: () => nextToolRadioGroup }),
  toParentMessage: message => Message.GotToolRadioGroupMessage({ message }),
  foldOutMessage: foldToolRadioGroupOutMessage,
})

const foldGridSizeRadioGroupOutMessage = RadioGroup.OutMessage.match<
  Update.Step<Model, Message>
>({
  Selected:
    ({ value }) =>
    model =>
      requestGridSizeChange(model, Number(value)),
})

const foldGridSizeRadioGroup = Update.foldChild({
  update: GridSizeRadioGroup.update,
  read: (model: Model) => Option.some(model.gridSizeRadioGroup),
  write: (model, nextGridSizeRadioGroup) =>
    evo(model, { gridSizeRadioGroup: () => nextGridSizeRadioGroup }),
  toParentMessage: message => Message.GotGridSizeRadioGroupMessage({ message }),
  foldOutMessage: foldGridSizeRadioGroupOutMessage,
})

const foldPaletteRadioGroupOutMessage = RadioGroup.OutMessage.match<
  Update.Step<Model, Message>
>({
  Selected:
    ({ value }) =>
    model =>
      selectColor(
        model,
        paletteIndexFromValue(value, model.selectedColorIndex),
      ),
})

const foldPaletteRadioGroup = Update.foldChild({
  update: PaletteRadioGroup.update,
  read: (model: Model) => Option.some(model.paletteRadioGroup),
  write: (model, nextPaletteRadioGroup) =>
    evo(model, { paletteRadioGroup: () => nextPaletteRadioGroup }),
  toParentMessage: message => Message.GotPaletteRadioGroupMessage({ message }),
  foldOutMessage: foldPaletteRadioGroupOutMessage,
})

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    PressedCell: ({ x, y }) =>
      Match.value(model.tool).pipe(
        withUpdateReturn,
        Match.when('Brush', () => ({
          model: evo(model, {
            grid: () => applyBrush(model, x, y),
            undoStack: () => pushHistory(model.undoStack, model.grid),
            redoStack: () => [],
            isDrawing: () => true,
          }),
        })),
        Match.when('Fill', () => {
          const nextModel = evo(model, {
            grid: () => applyFill(model, x, y),
            undoStack: () => pushHistory(model.undoStack, model.grid),
            redoStack: () => [],
          })
          return { model: nextModel, commands: [saveCanvas(nextModel)] }
        }),
        Match.when('Eraser', () => ({
          model: evo(model, {
            grid: () => applyEraser(model, x, y),
            undoStack: () => pushHistory(model.undoStack, model.grid),
            redoStack: () => [],
            isDrawing: () => true,
          }),
        })),
        Match.exhaustive,
      ),

    EnteredCell: ({ x, y }) => {
      const withHover = evo(model, {
        maybeHoveredCell: () => Option.some({ x, y }),
      })

      if (model.isDrawing && model.tool === 'Brush') {
        return {
          model: evo(withHover, { grid: () => applyBrush(model, x, y) }),
        }
      }

      if (model.isDrawing && model.tool === 'Eraser') {
        return {
          model: evo(withHover, { grid: () => applyEraser(model, x, y) }),
        }
      }

      return { model: withHover }
    },

    LeftCanvas: () => ({
      model: evo(model, { maybeHoveredCell: () => Option.none() }),
    }),

    ReleasedMouse: () => {
      if (!model.isDrawing) {
        return { model }
      }
      const nextModel = evo(model, { isDrawing: () => false })
      return { model: nextModel, commands: [saveCanvas(nextModel)] }
    },

    SelectedColor: ({ colorIndex }) => selectColor(model, colorIndex),

    SelectedTool: ({ tool }) => selectTool(model, tool),

    SelectedGridSize: ({ size }) => requestGridSizeChange(model, size),

    GotToolRadioGroupMessage: ({ message }) =>
      foldToolRadioGroup(model, message),

    GotGridSizeRadioGroupMessage: ({ message }) =>
      foldGridSizeRadioGroup(model, message),

    GotPaletteRadioGroupMessage: ({ message }) =>
      foldPaletteRadioGroup(model, message),

    ToggledMirrorHorizontal: () => {
      const nextMirrorMode = Match.value(model.mirrorMode).pipe(
        Match.when('None', () => 'Horizontal' as const),
        Match.when('Horizontal', () => 'None' as const),
        Match.when('Vertical', () => 'Both' as const),
        Match.when('Both', () => 'Vertical' as const),
        Match.exhaustive,
      )
      return { model: evo(model, { mirrorMode: () => nextMirrorMode }) }
    },

    ToggledMirrorVertical: () => {
      const nextMirrorMode = Match.value(model.mirrorMode).pipe(
        Match.when('None', () => 'Vertical' as const),
        Match.when('Vertical', () => 'None' as const),
        Match.when('Horizontal', () => 'Both' as const),
        Match.when('Both', () => 'Horizontal' as const),
        Match.exhaustive,
      )
      return { model: evo(model, { mirrorMode: () => nextMirrorMode }) }
    },

    ClickedUndo: () =>
      Array.match(model.undoStack, {
        onEmpty: () => ({ model }),
        onNonEmpty: nonEmptyUndoStack => {
          const nextModel = evo(model, {
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
          const nextModel = evo(model, {
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

      const nextModel = evo(model, {
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

      const nextModel = evo(model, {
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
      const nextModel = evo(model, {
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
          model: evo(stepModel, {
            maybeExportError: () => Option.some(error),
          }),
        }),
        foldErrorDialogOpen,
      ]),

    GotErrorDialogMessage: ({ message }) => foldErrorDialog(model, message),

    GotThemeListboxMessage: ({ message }) => foldThemeListbox(model, message),

    ConfirmedGridSizeChange: () =>
      Option.match(model.maybePendingGridSize, {
        onNone: () => ({ model }),
        onSome: pendingSize =>
          Update.combine(model, [
            stepModel => applyGridSizeChange(stepModel, pendingSize),
            foldGridSizeConfirmDialogClose,
            stepModel => ({
              model: stepModel,
              commands: [saveCanvas(stepModel)],
            }),
          ]),
      }),

    GotGridSizeConfirmDialogMessage: ({ message }) =>
      foldGridSizeConfirmDialog(model, message),
  })

const applyGridSizeChange = (model: Model, size: number): UpdateReturn => ({
  model: evo(model, {
    grid: () => createEmptyGrid(size),
    gridSize: () => size,
    undoStack: () => [],
    redoStack: () => [],
    isDrawing: () => false,
    maybeHoveredCell: () => Option.none(),
  }),
})

const requestGridSizeChange = (model: Model, size: number): UpdateReturn => {
  if (size === model.gridSize) {
    return { model }
  }

  if (isGridEmpty(model.grid)) {
    return applyGridSizeChange(model, size)
  }

  return Update.combine(model, [
    stepModel => ({
      model: evo(stepModel, {
        maybePendingGridSize: () => Option.some(size),
      }),
    }),
    foldGridSizeConfirmDialogOpen,
  ])
}
