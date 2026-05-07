import { Array, Effect, Match as M, Option } from 'effect'
import { Command, Ui } from 'foldkit'
import { evo } from 'foldkit/struct'

import { ExportPng, saveCanvas } from './command'
import { DEFAULT_COLOR_INDEX, GRID_SIZE_STRINGS } from './constant'
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
  GotGridSizeRadioGroupMessage,
  GotMirrorHorizontalSwitchMessage,
  GotMirrorVerticalSwitchMessage,
  GotPaletteRadioGroupMessage,
  GotThemeListboxMessage,
  GotToolRadioGroupMessage,
  type Message,
} from './message'
import type { MirrorMode, Model, Tool } from './model'
import { PALETTE_THEMES, currentPaletteTheme } from './palette'

const TOOLS: ReadonlyArray<Tool> = ['Brush', 'Fill', 'Eraser']

const withUpdateReturn =
  M.withReturnType<readonly [Model, ReadonlyArray<Command.Command<Message>>]>()

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

export const update = (
  model: Model,
  message: Message,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] =>
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
        const paletteIndexStrings = currentPaletteTheme(model).colors.map(
          (_, index) => index.toString(),
        )
        const [nextPaletteRadioGroup, paletteCommands] = Ui.RadioGroup.select(
          model.paletteRadioGroup,
          colorIndex.toString(),
          paletteIndexStrings,
        )
        const nextModel = evo(model, {
          selectedColorIndex: () => colorIndex,
          paletteRadioGroup: () => nextPaletteRadioGroup,
        })
        return [
          nextModel,
          [
            ...paletteCommands.map(
              Command.mapEffect(
                Effect.map(radioMessage =>
                  GotPaletteRadioGroupMessage({ message: radioMessage }),
                ),
              ),
            ),
            saveCanvas(nextModel),
          ],
        ]
      },

      SelectedTool: ({ tool }) => {
        const [nextToolRadioGroup, toolCommands] = Ui.RadioGroup.select(
          model.toolRadioGroup,
          tool,
          TOOLS,
        )
        return [
          evo(model, {
            tool: () => tool,
            toolRadioGroup: () => nextToolRadioGroup,
          }),
          toolCommands.map(
            Command.mapEffect(
              Effect.map(radioMessage =>
                GotToolRadioGroupMessage({ message: radioMessage }),
              ),
            ),
          ),
        ]
      },

      SelectedGridSize: ({ size }) => requestGridSizeChange(model, size),

      ToggledMirrorHorizontal: () => {
        const nextMirrorMode = M.value(model.mirrorMode).pipe(
          M.when('None', () => 'Horizontal' as const),
          M.when('Horizontal', () => 'None' as const),
          M.when('Vertical', () => 'Both' as const),
          M.when('Both', () => 'Vertical' as const),
          M.exhaustive,
        )
        return [
          evo(model, {
            mirrorMode: () => nextMirrorMode,
            mirrorHorizontalSwitch: () =>
              evo(model.mirrorHorizontalSwitch, {
                isChecked: isChecked => !isChecked,
              }),
          }),
          [],
        ]
      },

      ToggledMirrorVertical: () => {
        const nextMirrorMode = M.value(model.mirrorMode).pipe(
          M.when('None', () => 'Vertical' as const),
          M.when('Vertical', () => 'None' as const),
          M.when('Horizontal', () => 'Both' as const),
          M.when('Both', () => 'Horizontal' as const),
          M.exhaustive,
        )
        return [
          evo(model, {
            mirrorMode: () => nextMirrorMode,
            mirrorVerticalSwitch: () =>
              evo(model.mirrorVerticalSwitch, {
                isChecked: isChecked => !isChecked,
              }),
          }),
          [],
        ]
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

      SelectedPaletteTheme: ({ themeIndex }) => {
        const nextTheme = PALETTE_THEMES[themeIndex]
        if (nextTheme === undefined) {
          return [model, []]
        }
        const paletteIndexStrings = nextTheme.colors.map((_, index) =>
          index.toString(),
        )
        const [nextPaletteRadioGroup] = Ui.RadioGroup.select(
          model.paletteRadioGroup,
          DEFAULT_COLOR_INDEX.toString(),
          paletteIndexStrings,
        )
        const [nextThemeListbox, themeListboxCommands] = Ui.Listbox.selectItem(
          model.themeListbox,
          themeIndex.toString(),
        )
        const nextModel = evo(model, {
          paletteThemeIndex: () => themeIndex,
          selectedColorIndex: () => DEFAULT_COLOR_INDEX,
          paletteRadioGroup: () => nextPaletteRadioGroup,
          themeListbox: () => nextThemeListbox,
        })
        return [
          nextModel,
          [
            ...themeListboxCommands.map(
              Command.mapEffect(
                Effect.map(listboxMessage =>
                  GotThemeListboxMessage({ message: listboxMessage }),
                ),
              ),
            ),
            saveCanvas(nextModel),
          ],
        ]
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
        const [nextErrorDialog, errorDialogCommands] = Ui.Dialog.open(
          model.errorDialog,
        )

        return [
          evo(model, {
            maybeExportError: () => Option.some(error),
            errorDialog: () => nextErrorDialog,
          }),
          errorDialogCommands.map(
            Command.mapEffect(
              Effect.map(dialogMessage =>
                GotErrorDialogMessage({ message: dialogMessage }),
              ),
            ),
          ),
        ]
      },

      DismissedErrorDialog: () => {
        const [nextDialog, dialogCommands] = Ui.Dialog.close(model.errorDialog)
        return [
          evo(model, {
            errorDialog: () => nextDialog,
            maybeExportError: () => Option.none(),
          }),
          dialogCommands.map(
            Command.mapEffect(
              Effect.map(dialogMessage =>
                GotErrorDialogMessage({ message: dialogMessage }),
              ),
            ),
          ),
        ]
      },

      GotErrorDialogMessage: ({ message }) => {
        const [nextErrorDialog, errorDialogCommands] = Ui.Dialog.update(
          model.errorDialog,
          message,
        )
        return [
          evo(model, { errorDialog: () => nextErrorDialog }),
          errorDialogCommands.map(
            Command.mapEffect(
              Effect.map(dialogMessage =>
                GotErrorDialogMessage({ message: dialogMessage }),
              ),
            ),
          ),
        ]
      },

      GotToolRadioGroupMessage: ({ message }) => {
        const [nextToolRadioGroup, toolCommands] = Ui.RadioGroup.update(
          model.toolRadioGroup,
          message,
        )
        return [
          evo(model, { toolRadioGroup: () => nextToolRadioGroup }),
          toolCommands.map(
            Command.mapEffect(
              Effect.map(radioMessage =>
                GotToolRadioGroupMessage({ message: radioMessage }),
              ),
            ),
          ),
        ]
      },

      GotGridSizeRadioGroupMessage: ({ message }) => {
        const [nextGridSizeRadioGroup, gridSizeCommands] = Ui.RadioGroup.update(
          model.gridSizeRadioGroup,
          message,
        )
        return [
          evo(model, { gridSizeRadioGroup: () => nextGridSizeRadioGroup }),
          gridSizeCommands.map(
            Command.mapEffect(
              Effect.map(radioMessage =>
                GotGridSizeRadioGroupMessage({ message: radioMessage }),
              ),
            ),
          ),
        ]
      },

      GotPaletteRadioGroupMessage: ({ message }) => {
        const [nextPaletteRadioGroup, paletteCommands] = Ui.RadioGroup.update(
          model.paletteRadioGroup,
          message,
        )
        return [
          evo(model, { paletteRadioGroup: () => nextPaletteRadioGroup }),
          paletteCommands.map(
            Command.mapEffect(
              Effect.map(radioMessage =>
                GotPaletteRadioGroupMessage({ message: radioMessage }),
              ),
            ),
          ),
        ]
      },

      GotMirrorHorizontalSwitchMessage: ({ message }) => {
        const [nextSwitch, switchCommands] = Ui.Switch.update(
          model.mirrorHorizontalSwitch,
          message,
        )
        const isHorizontal = nextSwitch.isChecked
        const isVertical = model.mirrorVerticalSwitch.isChecked
        const nextMirrorMode: MirrorMode =
          isHorizontal && isVertical
            ? 'Both'
            : isHorizontal
              ? 'Horizontal'
              : isVertical
                ? 'Vertical'
                : 'None'
        return [
          evo(model, {
            mirrorHorizontalSwitch: () => nextSwitch,
            mirrorMode: () => nextMirrorMode,
          }),
          switchCommands.map(
            Command.mapEffect(
              Effect.map(switchMessage =>
                GotMirrorHorizontalSwitchMessage({ message: switchMessage }),
              ),
            ),
          ),
        ]
      },

      GotMirrorVerticalSwitchMessage: ({ message }) => {
        const [nextSwitch, switchCommands] = Ui.Switch.update(
          model.mirrorVerticalSwitch,
          message,
        )
        const isHorizontal = model.mirrorHorizontalSwitch.isChecked
        const isVertical = nextSwitch.isChecked
        const nextMirrorMode: MirrorMode =
          isHorizontal && isVertical
            ? 'Both'
            : isHorizontal
              ? 'Horizontal'
              : isVertical
                ? 'Vertical'
                : 'None'
        return [
          evo(model, {
            mirrorVerticalSwitch: () => nextSwitch,
            mirrorMode: () => nextMirrorMode,
          }),
          switchCommands.map(
            Command.mapEffect(
              Effect.map(switchMessage =>
                GotMirrorVerticalSwitchMessage({ message: switchMessage }),
              ),
            ),
          ),
        ]
      },

      GotThemeListboxMessage: ({ message }) => {
        const [nextThemeListbox, themeListboxCommands] = Ui.Listbox.update(
          model.themeListbox,
          message,
        )
        return [
          evo(model, { themeListbox: () => nextThemeListbox }),
          themeListboxCommands.map(
            Command.mapEffect(
              Effect.map(listboxMessage =>
                GotThemeListboxMessage({ message: listboxMessage }),
              ),
            ),
          ),
        ]
      },

      ConfirmedGridSizeChange: () =>
        Option.match(model.maybePendingGridSize, {
          onNone: () => [model, []],
          onSome: pendingSize => {
            const [nextDialog, dialogCommands] = Ui.Dialog.update(
              model.gridSizeConfirmDialog,
              Ui.Dialog.Closed(),
            )
            const mappedDialogCommands = dialogCommands.map(
              Command.mapEffect(
                Effect.map(dialogMessage =>
                  GotGridSizeConfirmDialogMessage({
                    message: dialogMessage,
                  }),
                ),
              ),
            )
            const [resizedModel] = applyGridSizeChange(model, pendingSize)
            const nextModel = evo(resizedModel, {
              gridSizeConfirmDialog: () => nextDialog,
              maybePendingGridSize: () => Option.none(),
            })
            return [nextModel, [...mappedDialogCommands, saveCanvas(nextModel)]]
          },
        }),

      DismissedGridSizeConfirmDialog: () => {
        const [nextDialog, dialogCommands] = Ui.Dialog.close(
          model.gridSizeConfirmDialog,
        )
        const nextGridSizeRadioGroup = evo(model.gridSizeRadioGroup, {
          selectedValue: () => Option.some(model.gridSize.toString()),
        })
        return [
          evo(model, {
            gridSizeConfirmDialog: () => nextDialog,
            maybePendingGridSize: () => Option.none(),
            gridSizeRadioGroup: () => nextGridSizeRadioGroup,
          }),
          dialogCommands.map(
            Command.mapEffect(
              Effect.map(dialogMessage =>
                GotGridSizeConfirmDialogMessage({ message: dialogMessage }),
              ),
            ),
          ),
        ]
      },

      GotGridSizeConfirmDialogMessage: ({ message }) => {
        const [nextDialog, dialogCommands] = Ui.Dialog.update(
          model.gridSizeConfirmDialog,
          message,
        )
        return [
          evo(model, { gridSizeConfirmDialog: () => nextDialog }),
          dialogCommands.map(
            Command.mapEffect(
              Effect.map(dialogMessage =>
                GotGridSizeConfirmDialogMessage({ message: dialogMessage }),
              ),
            ),
          ),
        ]
      },
    }),
  )

const applyGridSizeChange = (
  model: Model,
  size: number,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] => {
  const [nextGridSizeRadioGroup, radioCommands] = Ui.RadioGroup.select(
    model.gridSizeRadioGroup,
    size.toString(),
    GRID_SIZE_STRINGS,
  )
  return [
    evo(model, {
      grid: () => createEmptyGrid(size),
      gridSize: () => size,
      undoStack: () => [],
      redoStack: () => [],
      isDrawing: () => false,
      maybeHoveredCell: () => Option.none(),
      gridSizeRadioGroup: () => nextGridSizeRadioGroup,
    }),
    radioCommands.map(
      Command.mapEffect(
        Effect.map(radioMessage =>
          GotGridSizeRadioGroupMessage({ message: radioMessage }),
        ),
      ),
    ),
  ]
}

const requestGridSizeChange = (
  model: Model,
  size: number,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] => {
  if (size === model.gridSize) {
    return [model, []]
  }

  if (isGridEmpty(model.grid)) {
    return applyGridSizeChange(model, size)
  }

  const [nextDialog, dialogCommands] = Ui.Dialog.open(
    model.gridSizeConfirmDialog,
  )
  return [
    evo(model, {
      maybePendingGridSize: () => Option.some(size),
      gridSizeConfirmDialog: () => nextDialog,
    }),
    dialogCommands.map(
      Command.mapEffect(
        Effect.map(dialogMessage =>
          GotGridSizeConfirmDialogMessage({ message: dialogMessage }),
        ),
      ),
    ),
  ]
}
