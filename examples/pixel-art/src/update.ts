import { Array, Match as M, Option } from 'effect'
import { Command } from 'foldkit'
import { evo } from 'foldkit/struct'

import { Dialog, Listbox } from '@foldkit/ui'

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
import {
  GotErrorDialogMessage,
  GotGridSizeConfirmDialogMessage,
  GotThemeListboxMessage,
  type Message,
} from './message'
import { type Model } from './model'
import { PALETTE_THEMES } from './palette'
import { ThemeListbox } from './view/toolbar'

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const withUpdateReturn = M.withReturnType<UpdateReturn>()

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

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      PressedCell: ({ x, y }) =>
        M.value(model.tool).pipe(
          withUpdateReturn,
          M.when('Brush', () => [
            evo(model, {
              grid: () => applyBrush(model, x, y),
              undoStack: () => pushHistory(model.undoStack, model.grid),
              redoStack: () => [],
              isDrawing: () => true,
            }),
            [],
          ]),
          M.when('Fill', () => {
            const nextModel = evo(model, {
              grid: () => applyFill(model, x, y),
              undoStack: () => pushHistory(model.undoStack, model.grid),
              redoStack: () => [],
            })
            return [nextModel, [saveCanvas(nextModel)]]
          }),
          M.when('Eraser', () => [
            evo(model, {
              grid: () => applyEraser(model, x, y),
              undoStack: () => pushHistory(model.undoStack, model.grid),
              redoStack: () => [],
              isDrawing: () => true,
            }),
            [],
          ]),
          M.exhaustive,
        ),

      EnteredCell: ({ x, y }) => {
        const withHover = evo(model, {
          maybeHoveredCell: () => Option.some({ x, y }),
        })

        if (model.isDrawing && model.tool === 'Brush') {
          return [evo(withHover, { grid: () => applyBrush(model, x, y) }), []]
        }

        if (model.isDrawing && model.tool === 'Eraser') {
          return [evo(withHover, { grid: () => applyEraser(model, x, y) }), []]
        }

        return [withHover, []]
      },

      LeftCanvas: () => [
        evo(model, { maybeHoveredCell: () => Option.none() }),
        [],
      ],

      ReleasedMouse: () => {
        if (!model.isDrawing) {
          return [model, []]
        }
        const nextModel = evo(model, { isDrawing: () => false })
        return [nextModel, [saveCanvas(nextModel)]]
      },

      SelectedColor: ({ colorIndex }) => {
        const nextModel = evo(model, {
          selectedColorIndex: () => colorIndex,
        })
        return [nextModel, [saveCanvas(nextModel)]]
      },

      SelectedTool: ({ tool }) => [evo(model, { tool: () => tool }), []],

      SelectedGridSize: ({ size }) => requestGridSizeChange(model, size),

      ToggledMirrorHorizontal: () => {
        const nextMirrorMode = M.value(model.mirrorMode).pipe(
          M.when('None', () => 'Horizontal' as const),
          M.when('Horizontal', () => 'None' as const),
          M.when('Vertical', () => 'Both' as const),
          M.when('Both', () => 'Vertical' as const),
          M.exhaustive,
        )
        return [evo(model, { mirrorMode: () => nextMirrorMode }), []]
      },

      ToggledMirrorVertical: () => {
        const nextMirrorMode = M.value(model.mirrorMode).pipe(
          M.when('None', () => 'Vertical' as const),
          M.when('Vertical', () => 'None' as const),
          M.when('Horizontal', () => 'Both' as const),
          M.when('Both', () => 'Horizontal' as const),
          M.exhaustive,
        )
        return [evo(model, { mirrorMode: () => nextMirrorMode }), []]
      },

      ClickedUndo: () =>
        Array.match(model.undoStack, {
          onEmpty: () => [model, []],
          onNonEmpty: nonEmptyUndoStack => {
            const nextModel = evo(model, {
              grid: () => Array.lastNonEmpty(nonEmptyUndoStack),
              undoStack: () => Array.initNonEmpty(nonEmptyUndoStack),
              redoStack: () => [...model.redoStack, model.grid],
            })
            return [nextModel, [saveCanvas(nextModel)]]
          },
        }),

      ClickedRedo: () =>
        Array.match(model.redoStack, {
          onEmpty: () => [model, []],
          onNonEmpty: nonEmptyRedoStack => {
            const nextModel = evo(model, {
              grid: () => Array.lastNonEmpty(nonEmptyRedoStack),
              undoStack: () => [...model.undoStack, model.grid],
              redoStack: () => Array.initNonEmpty(nonEmptyRedoStack),
            })
            return [nextModel, [saveCanvas(nextModel)]]
          },
        }),

      ClickedHistoryStep: ({ stepIndex }) => {
        const targetGrid = model.undoStack[stepIndex]
        if (targetGrid === undefined) {
          return [model, []]
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

        return [nextModel, [saveCanvas(nextModel)]]
      },

      ClickedRedoStep: ({ stepIndex }) => {
        const targetGrid = model.redoStack[stepIndex]
        if (targetGrid === undefined) {
          return [model, []]
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

        return [nextModel, [saveCanvas(nextModel)]]
      },

      ClickedClear: () => {
        const nextModel = evo(model, {
          grid: () => createEmptyGrid(model.gridSize),
          undoStack: () => pushHistory(model.undoStack, model.grid),
          redoStack: () => [],
        })
        return [nextModel, [saveCanvas(nextModel)]]
      },

      ClickedExport: () => [
        model,
        [
          ExportPng({
            grid: model.grid,
            gridSize: model.gridSize,
            paletteThemeIndex: model.paletteThemeIndex,
          }),
        ],
      ],

      SucceededExportPng: () => [model, []],

      CompletedSaveCanvas: () => [model, []],

      FailedExportPng: ({ error }) => {
        const [nextErrorDialog, errorDialogCommands] = Dialog.open(
          model.errorDialog,
        )

        return [
          evo(model, {
            maybeExportError: () => Option.some(error),
            errorDialog: () => nextErrorDialog,
          }),
          Command.mapMessages(errorDialogCommands, dialogMessage =>
            GotErrorDialogMessage({ message: dialogMessage }),
          ),
        ]
      },

      GotErrorDialogMessage: ({ message }) => {
        const [nextErrorDialog, errorDialogCommands, maybeOutMessage] =
          Dialog.update(model.errorDialog, message)
        const mappedCommands = Command.mapMessages(
          errorDialogCommands,
          dialogMessage => GotErrorDialogMessage({ message: dialogMessage }),
        )
        return Option.match(maybeOutMessage, {
          onNone: () => [
            evo(model, { errorDialog: () => nextErrorDialog }),
            mappedCommands,
          ],
          onSome: M.type<Dialog.OutMessage>().pipe(
            M.withReturnType<UpdateReturn>(),
            M.tagsExhaustive({
              Opened: () => [
                evo(model, { errorDialog: () => nextErrorDialog }),
                mappedCommands,
              ],
              Closed: () => [
                evo(model, {
                  errorDialog: () => nextErrorDialog,
                  maybeExportError: () => Option.none(),
                }),
                mappedCommands,
              ],
            }),
          ),
        })
      },

      GotThemeListboxMessage: ({ message }) => {
        const [nextThemeListbox, themeListboxCommands, maybeOutMessage] =
          ThemeListbox.update(model.themeListbox, message)
        const mappedCommands = Command.mapMessages(
          themeListboxCommands,
          listboxMessage => GotThemeListboxMessage({ message: listboxMessage }),
        )
        return Option.match(maybeOutMessage, {
          onNone: () => [
            evo(model, { themeListbox: () => nextThemeListbox }),
            mappedCommands,
          ],
          onSome: M.type<Listbox.OutMessage>().pipe(
            M.withReturnType<UpdateReturn>(),
            M.tagsExhaustive({
              Selected: ({ value }) => {
                const themeIndex = Number(value)
                const nextTheme = PALETTE_THEMES[themeIndex]
                if (nextTheme === undefined) {
                  return [
                    evo(model, { themeListbox: () => nextThemeListbox }),
                    mappedCommands,
                  ]
                }
                const nextModel = evo(model, {
                  paletteThemeIndex: () => themeIndex,
                  selectedColorIndex: () => DEFAULT_COLOR_INDEX,
                  themeListbox: () => nextThemeListbox,
                })
                return [nextModel, [...mappedCommands, saveCanvas(nextModel)]]
              },
            }),
          ),
        })
      },

      ConfirmedGridSizeChange: () =>
        Option.match(model.maybePendingGridSize, {
          onNone: () => [model, []],
          onSome: pendingSize => {
            const [nextDialog, dialogCommands] = Dialog.close(
              model.gridSizeConfirmDialog,
            )
            const mappedDialogCommands = Command.mapMessages(
              dialogCommands,
              dialogMessage =>
                GotGridSizeConfirmDialogMessage({
                  message: dialogMessage,
                }),
            )
            const [resizedModel] = applyGridSizeChange(model, pendingSize)
            const nextModel = evo(resizedModel, {
              gridSizeConfirmDialog: () => nextDialog,
              maybePendingGridSize: () => Option.none(),
            })
            return [nextModel, [...mappedDialogCommands, saveCanvas(nextModel)]]
          },
        }),

      GotGridSizeConfirmDialogMessage: ({ message }) => {
        const [nextDialog, dialogCommands, maybeOutMessage] = Dialog.update(
          model.gridSizeConfirmDialog,
          message,
        )
        const mappedCommands = Command.mapMessages(
          dialogCommands,
          dialogMessage =>
            GotGridSizeConfirmDialogMessage({ message: dialogMessage }),
        )
        return Option.match(maybeOutMessage, {
          onNone: () => [
            evo(model, { gridSizeConfirmDialog: () => nextDialog }),
            mappedCommands,
          ],
          onSome: M.type<Dialog.OutMessage>().pipe(
            M.withReturnType<UpdateReturn>(),
            M.tagsExhaustive({
              Opened: () => [
                evo(model, { gridSizeConfirmDialog: () => nextDialog }),
                mappedCommands,
              ],
              Closed: () => [
                evo(model, {
                  gridSizeConfirmDialog: () => nextDialog,
                  maybePendingGridSize: () => Option.none(),
                }),
                mappedCommands,
              ],
            }),
          ),
        })
      },
    }),
  )

const applyGridSizeChange = (model: Model, size: number): UpdateReturn => [
  evo(model, {
    grid: () => createEmptyGrid(size),
    gridSize: () => size,
    undoStack: () => [],
    redoStack: () => [],
    isDrawing: () => false,
    maybeHoveredCell: () => Option.none(),
  }),
  [],
]

const requestGridSizeChange = (model: Model, size: number): UpdateReturn => {
  if (size === model.gridSize) {
    return [model, []]
  }

  if (isGridEmpty(model.grid)) {
    return applyGridSizeChange(model, size)
  }

  const [nextDialog, dialogCommands] = Dialog.open(model.gridSizeConfirmDialog)
  return [
    evo(model, {
      maybePendingGridSize: () => Option.some(size),
      gridSizeConfirmDialog: () => nextDialog,
    }),
    Command.mapMessages(dialogCommands, dialogMessage =>
      GotGridSizeConfirmDialogMessage({ message: dialogMessage }),
    ),
  ]
}
