import { Array, Match as M, Option } from 'effect'
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
import type { MirrorMode, Model, PaletteIndex, Tool } from './model'
import { PALETTE_THEMES, currentPaletteTheme } from './palette'
import {
  GridSizeRadioGroup,
  PaletteRadioGroup,
  ThemeListbox,
  ToolRadioGroup,
} from './view/toolbar'

const TOOLS: ReadonlyArray<Tool> = ['Brush', 'Fill', 'Eraser']

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
        const paletteIndexStrings = currentPaletteTheme(model).colors.map(
          (_, index) => index.toString(),
        )
        const [nextPaletteRadioGroup, paletteCommands] =
          PaletteRadioGroup.select(
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
            ...Command.mapMessages(paletteCommands, radioMessage =>
              GotPaletteRadioGroupMessage({ message: radioMessage }),
            ),
            saveCanvas(nextModel),
          ],
        ]
      },

      SelectedTool: ({ tool }) => {
        const [nextToolRadioGroup, toolCommands] = ToolRadioGroup.select(
          model.toolRadioGroup,
          tool,
          TOOLS,
        )
        return [
          evo(model, {
            tool: () => tool,
            toolRadioGroup: () => nextToolRadioGroup,
          }),
          Command.mapMessages(toolCommands, radioMessage =>
            GotToolRadioGroupMessage({ message: radioMessage }),
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
        const [nextPaletteRadioGroup] = PaletteRadioGroup.select(
          model.paletteRadioGroup,
          DEFAULT_COLOR_INDEX.toString(),
          paletteIndexStrings,
        )
        const [nextThemeListbox, themeListboxCommands] =
          ThemeListbox.selectItem(model.themeListbox, themeIndex.toString())
        const nextModel = evo(model, {
          paletteThemeIndex: () => themeIndex,
          selectedColorIndex: () => DEFAULT_COLOR_INDEX,
          paletteRadioGroup: () => nextPaletteRadioGroup,
          themeListbox: () => nextThemeListbox,
        })
        return [
          nextModel,
          [
            ...Command.mapMessages(themeListboxCommands, listboxMessage =>
              GotThemeListboxMessage({ message: listboxMessage }),
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
          Command.mapMessages(errorDialogCommands, dialogMessage =>
            GotErrorDialogMessage({ message: dialogMessage }),
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
          Command.mapMessages(dialogCommands, dialogMessage =>
            GotErrorDialogMessage({ message: dialogMessage }),
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
          Command.mapMessages(errorDialogCommands, dialogMessage =>
            GotErrorDialogMessage({ message: dialogMessage }),
          ),
        ]
      },

      GotToolRadioGroupMessage: ({ message }) => {
        const [nextToolRadioGroup, toolCommands, maybeOutMessage] =
          ToolRadioGroup.update(model.toolRadioGroup, message)
        const mappedCommands = Command.mapMessages(toolCommands, radioMessage =>
          GotToolRadioGroupMessage({ message: radioMessage }),
        )
        return Option.match(maybeOutMessage, {
          onNone: (): UpdateReturn => [
            evo(model, { toolRadioGroup: () => nextToolRadioGroup }),
            mappedCommands,
          ],
          onSome: M.type<Ui.RadioGroup.OutMessage<Tool>>().pipe(
            M.withReturnType<UpdateReturn>(),
            M.tagsExhaustive({
              Selected: ({ value }) => [
                evo(model, {
                  tool: () => value,
                  toolRadioGroup: () => nextToolRadioGroup,
                }),
                mappedCommands,
              ],
            }),
          ),
        })
      },

      GotGridSizeRadioGroupMessage: ({ message }) => {
        const [nextGridSizeRadioGroup, gridSizeCommands, maybeOutMessage] =
          GridSizeRadioGroup.update(model.gridSizeRadioGroup, message)
        const mappedCommands = Command.mapMessages(
          gridSizeCommands,
          radioMessage =>
            GotGridSizeRadioGroupMessage({ message: radioMessage }),
        )
        return Option.match(maybeOutMessage, {
          onNone: (): UpdateReturn => [
            evo(model, { gridSizeRadioGroup: () => nextGridSizeRadioGroup }),
            mappedCommands,
          ],
          onSome: M.type<Ui.RadioGroup.OutMessage>().pipe(
            M.withReturnType<UpdateReturn>(),
            M.tagsExhaustive({
              Selected: ({ value }) => {
                const [modelAfterResize, resizeCommands] =
                  requestGridSizeChange(
                    evo(model, {
                      gridSizeRadioGroup: () => nextGridSizeRadioGroup,
                    }),
                    Number(value),
                  )
                return [
                  modelAfterResize,
                  [...mappedCommands, ...resizeCommands],
                ]
              },
            }),
          ),
        })
      },

      GotPaletteRadioGroupMessage: ({ message }) => {
        const [nextPaletteRadioGroup, paletteCommands, maybeOutMessage] =
          PaletteRadioGroup.update(model.paletteRadioGroup, message)
        const mappedCommands = Command.mapMessages(
          paletteCommands,
          radioMessage =>
            GotPaletteRadioGroupMessage({ message: radioMessage }),
        )
        return Option.match(maybeOutMessage, {
          onNone: (): UpdateReturn => [
            evo(model, { paletteRadioGroup: () => nextPaletteRadioGroup }),
            mappedCommands,
          ],
          onSome: M.type<Ui.RadioGroup.OutMessage>().pipe(
            M.withReturnType<UpdateReturn>(),
            M.tagsExhaustive({
              Selected: ({ value }) => {
                const nextModel = evo(model, {
                  selectedColorIndex: () => Number(value) as PaletteIndex,
                  paletteRadioGroup: () => nextPaletteRadioGroup,
                })
                return [nextModel, [...mappedCommands, saveCanvas(nextModel)]]
              },
            }),
          ),
        })
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
          Command.mapMessages(switchCommands, switchMessage =>
            GotMirrorHorizontalSwitchMessage({ message: switchMessage }),
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
          Command.mapMessages(switchCommands, switchMessage =>
            GotMirrorVerticalSwitchMessage({ message: switchMessage }),
          ),
        ]
      },

      GotThemeListboxMessage: ({ message }) => {
        const [nextThemeListbox, themeListboxCommands, maybeOutMessage] =
          ThemeListbox.update(model.themeListbox, message)
        const mappedCommands = Command.mapMessages(
          themeListboxCommands,
          listboxMessage => GotThemeListboxMessage({ message: listboxMessage }),
        )
        return Option.match(maybeOutMessage, {
          onNone: (): UpdateReturn => [
            evo(model, { themeListbox: () => nextThemeListbox }),
            mappedCommands,
          ],
          onSome: M.type<Ui.Listbox.OutMessage>().pipe(
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
                const paletteIndexStrings = nextTheme.colors.map((_, index) =>
                  index.toString(),
                )
                const [nextPaletteRadioGroup] = PaletteRadioGroup.select(
                  model.paletteRadioGroup,
                  DEFAULT_COLOR_INDEX.toString(),
                  paletteIndexStrings,
                )
                const nextModel = evo(model, {
                  paletteThemeIndex: () => themeIndex,
                  selectedColorIndex: () => DEFAULT_COLOR_INDEX,
                  paletteRadioGroup: () => nextPaletteRadioGroup,
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
            const [nextDialog, dialogCommands] = Ui.Dialog.update(
              model.gridSizeConfirmDialog,
              Ui.Dialog.RequestedClose(),
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
          Command.mapMessages(dialogCommands, dialogMessage =>
            GotGridSizeConfirmDialogMessage({ message: dialogMessage }),
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
          Command.mapMessages(dialogCommands, dialogMessage =>
            GotGridSizeConfirmDialogMessage({ message: dialogMessage }),
          ),
        ]
      },
    }),
  )

const applyGridSizeChange = (model: Model, size: number): UpdateReturn => {
  const [nextGridSizeRadioGroup, radioCommands] = GridSizeRadioGroup.select(
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
    Command.mapMessages(radioCommands, radioMessage =>
      GotGridSizeRadioGroupMessage({ message: radioMessage }),
    ),
  ]
}

const requestGridSizeChange = (model: Model, size: number): UpdateReturn => {
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
    Command.mapMessages(dialogCommands, dialogMessage =>
      GotGridSizeConfirmDialogMessage({ message: dialogMessage }),
    ),
  ]
}
