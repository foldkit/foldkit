import {
  Array,
  Effect,
  Equal,
  Match,
  Option,
  Predicate,
  Schema,
  Stream,
  pipe,
} from 'effect'
import { KeyValueStore } from 'effect/persistence'
import { Block, Command, Dom } from 'foldkit'
import {
  type Html,
  type HtmlBuilder,
  createKeyedLazy,
  createLazy,
} from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { makeModifyFieldsFor, modifyFields } from 'foldkit/struct'

import {
  type Cell,
  Grid,
  MirrorMode,
  PaletteIndex,
  createEmptyGrid,
  erasePixels,
  floodFill,
  getMirroredPositions,
  isGridEmpty,
  pushHistory,
  setPixels,
} from './domain/grid'
import {
  EMPTY_COLOR,
  type HexColor,
  PALETTE_THEMES,
  type PaletteTheme,
  currentPaletteTheme,
  resolveColor,
} from './domain/palette'
import { Tool } from './domain/tool'
import { ErrorDialog } from './errorDialog'
import { GridSizeConfirmDialog } from './gridSizeConfirmDialog'
import { Header } from './header'
import { HistoryPanel } from './historyPanel'
import { Toolbar } from './toolbar'

const DEFAULT_GRID_SIZE = 16
const DEFAULT_COLOR_INDEX: PaletteIndex = 0
const DEFAULT_PALETTE_THEME_INDEX = 0
const CANVAS_SIZE_PX = 512
const EXPORT_SCALE = 4
const STORAGE_KEY = 'pixel-art-canvas'

// MODEL

const Position = Schema.Struct({ x: Schema.Number, y: Schema.Number })
type Position = typeof Position.Type

const SavedCanvas = Schema.Struct({
  grid: Grid,
  gridSize: Schema.Number,
  paletteThemeIndex: Schema.Number,
  selectedColorIndex: PaletteIndex,
})
type SavedCanvas = typeof SavedCanvas.Type

const SavedCanvasJsonString = Schema.fromJsonString(
  Schema.toCodecJson(SavedCanvas),
)

export const Canvas = Schema.Struct({
  grid: Grid,
  undoStack: Schema.Array(Grid),
  redoStack: Schema.Array(Grid),
  selectedColorIndex: PaletteIndex,
  gridSize: Schema.Number,
  tool: Tool,
  mirrorMode: MirrorMode,
  isDrawing: Schema.Boolean,
  maybeHoveredCell: Schema.Option(Position),
  paletteThemeIndex: Schema.Number,
})
export type Canvas = typeof Canvas.Type

export const Model = Schema.Struct({
  ...Canvas.fields,
  header: Header,
  toolbar: Toolbar,
  historyPanel: HistoryPanel,
  errorDialog: ErrorDialog,
  gridSizeConfirmDialog: GridSizeConfirmDialog,
})
export type Model = typeof Model.Type

export const Flags = Schema.Struct({
  maybeSavedCanvas: Schema.Option(SavedCanvas),
})
export type Flags = typeof Flags.Type

export const flags = Effect.gen(function* () {
  const store = yield* KeyValueStore.KeyValueStore
  const json = yield* Effect.fromOption(
    Option.fromNullishOr(yield* store.get(STORAGE_KEY)),
  )
  const decoded = yield* Schema.decodeEffect(SavedCanvasJsonString)(json)

  return Flags.make({ maybeSavedCanvas: Option.some(decoded) })
}).pipe(
  Effect.catch(() =>
    Effect.succeed(Flags.make({ maybeSavedCanvas: Option.none() })),
  ),
)

// MESSAGE

export const Message = defineMessageUnion({
  PressedCell: { x: Schema.Number, y: Schema.Number },
  EnteredCell: { x: Schema.Number, y: Schema.Number },
  LeftCanvas: {},
  ReleasedMouse: {},
  SelectedColor: { colorIndex: PaletteIndex },
  SelectedTool: { tool: Tool },
  SelectedGridSize: { size: Schema.Number },
  ClickedUndo: {},
  ClickedRedo: {},
  SucceededExportPng: {},
  FailedExportPng: { error: Schema.String },
  CompletedSaveCanvas: {},
})
export type Message = typeof Message.Type
type ClickedUndo = typeof Message.ClickedUndo.Type
type ClickedRedo = typeof Message.ClickedRedo.Type
type SelectedTool = typeof Message.SelectedTool.Type

// COMMAND

export const SaveCanvas = Command.define('SaveCanvas', {
  args: {
    grid: Grid,
    gridSize: Schema.Number,
    paletteThemeIndex: Schema.Number,
    selectedColorIndex: PaletteIndex,
  },
  messages: [Message.CompletedSaveCanvas],
})

export const ExportPng = Command.define('ExportPng', {
  args: {
    grid: Grid,
    gridSize: Schema.Number,
    paletteThemeIndex: Schema.Number,
  },
  messages: [Message.SucceededExportPng, Message.FailedExportPng],
})

export class Application extends Block<
  Application,
  Readonly<{ flags: Flags }>
>()('Application', {
  Model,
  Message,
  Command: [SaveCanvas, ExportPng],
}) {}

const saveCanvas = (model: Canvas) =>
  SaveCanvas({
    grid: model.grid,
    gridSize: model.gridSize,
    paletteThemeIndex: model.paletteThemeIndex,
    selectedColorIndex: model.selectedColorIndex,
  })

const writeCanvas = (
  store: typeof KeyValueStore.KeyValueStore.Service,
  canvas: SavedCanvas,
) =>
  Effect.gen(function* () {
    const encodedCanvas = yield* Schema.encodeEffect(SavedCanvasJsonString)(
      canvas,
    )
    yield* store.set(STORAGE_KEY, encodedCanvas)
    return Message.CompletedSaveCanvas()
  }).pipe(Effect.catch(() => Effect.succeed(Message.CompletedSaveCanvas())))

const exportPng = ({
  grid,
  gridSize,
  paletteThemeIndex,
}: Readonly<{ grid: Grid; gridSize: number; paletteThemeIndex: number }>) =>
  Effect.gen(function* () {
    const theme = PALETTE_THEMES[paletteThemeIndex] ?? PALETTE_THEMES[0]
    const scale =
      Math.max(1, Math.floor(CANVAS_SIZE_PX / gridSize)) * EXPORT_SCALE
    const canvas = document.createElement('canvas')
    canvas.width = gridSize * scale
    canvas.height = gridSize * scale
    const context = canvas.getContext('2d')

    if (Predicate.isNull(context)) {
      return yield* Effect.fail(
        Message.FailedExportPng({
          error: 'Canvas 2D context not available',
        }),
      )
    }

    Array.forEach(grid, (row, y) => {
      Array.forEach(row, (cell, x) => {
        context.fillStyle = resolveColor(cell, theme)
        context.fillRect(x * scale, y * scale, scale, scale)
      })
    })

    const link = document.createElement('a')
    link.download = 'pixel-art.png'
    link.href = canvas.toDataURL('image/png')
    link.click()

    return Message.SucceededExportPng()
  }).pipe(Effect.catchTag('FailedExportPng', error => Effect.succeed(error)))

// UPDATE

const modifyCanvas = makeModifyFieldsFor<Canvas>()

const applyEraser = (model: Canvas, x: number, y: number) => {
  const positions = getMirroredPositions(x, y, model.gridSize, model.mirrorMode)
  return erasePixels(model.grid, positions)
}

const applyBrush = (model: Canvas, x: number, y: number) => {
  const positions = getMirroredPositions(x, y, model.gridSize, model.mirrorMode)
  return setPixels(model.grid, positions, model.selectedColorIndex)
}

const applyFill = (model: Canvas, x: number, y: number) => {
  const positions = getMirroredPositions(x, y, model.gridSize, 'None')
  return Array.reduce(positions, model.grid, (currentGrid, [fillX, fillY]) =>
    floodFill(currentGrid, fillX, fillY, model.selectedColorIndex),
  )
}

const withSavedCanvas = <M extends Canvas>(nextModel: M) => ({
  model: nextModel,
  commands: [saveCanvas(nextModel)],
})

const selectToolStep = <M extends Canvas>(model: M, tool: Tool) => ({
  model: modifyCanvas(model, { tool: () => tool }),
})

const selectColorStep = <M extends Canvas>(
  model: M,
  colorIndex: PaletteIndex,
) =>
  withSavedCanvas(modifyCanvas(model, { selectedColorIndex: () => colorIndex }))

const toggleMirrorHorizontalStep = <M extends Canvas>(model: M) => {
  const nextMirrorMode = Match.value(model.mirrorMode).pipe(
    Match.withReturnType<MirrorMode>(),
    Match.when('None', () => 'Horizontal'),
    Match.when('Horizontal', () => 'None'),
    Match.when('Vertical', () => 'Both'),
    Match.when('Both', () => 'Vertical'),
    Match.exhaustive,
  )
  return { model: modifyCanvas(model, { mirrorMode: () => nextMirrorMode }) }
}

const toggleMirrorVerticalStep = <M extends Canvas>(model: M) => {
  const nextMirrorMode = Match.value(model.mirrorMode).pipe(
    Match.withReturnType<MirrorMode>(),
    Match.when('None', () => 'Vertical'),
    Match.when('Vertical', () => 'None'),
    Match.when('Horizontal', () => 'Both'),
    Match.when('Both', () => 'Horizontal'),
    Match.exhaustive,
  )
  return { model: modifyCanvas(model, { mirrorMode: () => nextMirrorMode }) }
}

const restoreHistoryStep = <M extends Canvas>(model: M, stepIndex: number) => {
  const targetGrid = model.undoStack[stepIndex]
  if (targetGrid === undefined) {
    return { model }
  }

  const statesAfterTarget = Array.drop(model.undoStack, stepIndex + 1)

  return withSavedCanvas(
    modifyCanvas(model, {
      grid: () => targetGrid,
      undoStack: () => Array.take(model.undoStack, stepIndex),
      redoStack: () => [
        ...model.redoStack,
        model.grid,
        ...Array.reverse(statesAfterTarget),
      ],
    }),
  )
}

const restoreRedoStep = <M extends Canvas>(model: M, stepIndex: number) => {
  const targetGrid = model.redoStack[stepIndex]
  if (targetGrid === undefined) {
    return { model }
  }

  const statesBetweenCurrentAndTarget = Array.drop(
    model.redoStack,
    stepIndex + 1,
  )

  return withSavedCanvas(
    modifyCanvas(model, {
      grid: () => targetGrid,
      undoStack: () => [
        ...model.undoStack,
        model.grid,
        ...Array.reverse(statesBetweenCurrentAndTarget),
      ],
      redoStack: () => Array.take(model.redoStack, stepIndex),
    }),
  )
}

const clearCanvasStep = <M extends Canvas>(model: M) =>
  withSavedCanvas(
    modifyCanvas(model, {
      grid: () => createEmptyGrid(model.gridSize),
      undoStack: () => pushHistory(model.undoStack, model.grid),
      redoStack: () => [],
    }),
  )

const applyGridSizeChange = (model: Model, size: number): Model =>
  modifyFields(model, {
    grid: () => createEmptyGrid(size),
    gridSize: () => size,
    undoStack: () => [],
    redoStack: () => [],
    isDrawing: () => false,
    maybeHoveredCell: () => Option.none(),
  })

const requestGridSizeChangeStep = (model: Model, size: number) => {
  if (size === model.gridSize) {
    return { model }
  }

  if (isGridEmpty(model.grid)) {
    return { model: applyGridSizeChange(model, size) }
  }

  return {
    model,
    messages: [
      model.gridSizeConfirmDialog.send(
        GridSizeConfirmDialog.Message.RequestedConfirmation({ size }),
      ),
    ],
  }
}

const exportStep = (model: Model) => ({
  model,
  commands: [
    ExportPng({
      grid: model.grid,
      gridSize: model.gridSize,
      paletteThemeIndex: model.paletteThemeIndex,
    }),
  ],
})

const selectPaletteThemeStep = (model: Model, themeIndex: number) => {
  const maybeNextTheme = Array.get(PALETTE_THEMES, themeIndex)

  if (Option.isNone(maybeNextTheme)) {
    return { model }
  }

  const nextModel = modifyFields(model, {
    paletteThemeIndex: () => themeIndex,
    selectedColorIndex: () => DEFAULT_COLOR_INDEX,
  })

  return { model: nextModel, commands: [saveCanvas(nextModel)] }
}

export const canvasUpdate = {
  PressedCell: <M extends Canvas>(model: M, { x, y }: Position) =>
    Match.value(model.tool).pipe(
      Match.when('Brush', () => ({
        model: modifyCanvas(model, {
          grid: () => applyBrush(model, x, y),
          undoStack: () => pushHistory(model.undoStack, model.grid),
          redoStack: () => [],
          isDrawing: () => true,
        }),
      })),
      Match.when('Fill', () =>
        withSavedCanvas(
          modifyCanvas(model, {
            grid: () => applyFill(model, x, y),
            undoStack: () => pushHistory(model.undoStack, model.grid),
            redoStack: () => [],
          }),
        ),
      ),
      Match.when('Eraser', () => ({
        model: modifyCanvas(model, {
          grid: () => applyEraser(model, x, y),
          undoStack: () => pushHistory(model.undoStack, model.grid),
          redoStack: () => [],
          isDrawing: () => true,
        }),
      })),
      Match.exhaustive,
    ),

  EnteredCell: <M extends Canvas>(model: M, { x, y }: Position) => {
    const maybeHoveredCell = () => Option.some({ x, y })

    if (model.isDrawing && model.tool === 'Brush') {
      return {
        model: modifyCanvas(model, {
          maybeHoveredCell,
          grid: () => applyBrush(model, x, y),
        }),
      }
    }

    if (model.isDrawing && model.tool === 'Eraser') {
      return {
        model: modifyCanvas(model, {
          maybeHoveredCell,
          grid: () => applyEraser(model, x, y),
        }),
      }
    }

    return { model: modifyCanvas(model, { maybeHoveredCell }) }
  },

  LeftCanvas: <M extends Canvas>(model: M) => ({
    model: modifyCanvas(model, { maybeHoveredCell: () => Option.none() }),
  }),

  ReleasedMouse: <M extends Canvas>(model: M) => {
    if (!model.isDrawing) {
      return { model }
    }

    return withSavedCanvas(modifyCanvas(model, { isDrawing: () => false }))
  },

  SelectedColor: <M extends Canvas>(
    model: M,
    { colorIndex }: Readonly<{ colorIndex: PaletteIndex }>,
  ) => selectColorStep(model, colorIndex),

  SelectedTool: <M extends Canvas>(
    model: M,
    { tool }: Readonly<{ tool: Tool }>,
  ) => selectToolStep(model, tool),

  ClickedUndo: <M extends Canvas>(model: M) =>
    Array.match(model.undoStack, {
      onEmpty: () => ({ model }),
      onNonEmpty: nonEmptyUndoStack =>
        withSavedCanvas(
          modifyCanvas(model, {
            grid: () => Array.lastNonEmpty(nonEmptyUndoStack),
            undoStack: () => Array.initNonEmpty(nonEmptyUndoStack),
            redoStack: () => [...model.redoStack, model.grid],
          }),
        ),
    }),

  ClickedRedo: <M extends Canvas>(model: M) =>
    Array.match(model.redoStack, {
      onEmpty: () => ({ model }),
      onNonEmpty: nonEmptyRedoStack =>
        withSavedCanvas(
          modifyCanvas(model, {
            grid: () => Array.lastNonEmpty(nonEmptyRedoStack),
            undoStack: () => [...model.undoStack, model.grid],
            redoStack: () => Array.initNonEmpty(nonEmptyRedoStack),
          }),
        ),
    }),

  SucceededExportPng: <M extends Canvas>(model: M) => ({ model }),

  CompletedSaveCanvas: <M extends Canvas>(model: M) => ({ model }),
}

// SUBSCRIPTION

type UndoRedoMessage = ClickedUndo | ClickedRedo

const toUndoRedoMessage = (
  event: KeyboardEvent,
): Option.Option<UndoRedoMessage> => {
  const isCtrlOrMeta = event.ctrlKey || event.metaKey
  if (!isCtrlOrMeta) {
    return Option.none()
  }

  return Match.value(event.key.toLowerCase()).pipe(
    Match.withReturnType<Option.Option<UndoRedoMessage>>(),
    Match.when('z', () =>
      Option.some(
        event.shiftKey ? Message.ClickedRedo() : Message.ClickedUndo(),
      ),
    ),
    Match.when('y', () => Option.some(Message.ClickedRedo())),
    Match.orElse(() => Option.none()),
  )
}

const toToolMessage = (event: KeyboardEvent): Option.Option<SelectedTool> => {
  if (event.ctrlKey || event.metaKey) {
    return Option.none()
  }

  return Match.value(event.key.toLowerCase()).pipe(
    Match.withReturnType<Option.Option<SelectedTool>>(),
    Match.when('b', () => Option.some(Message.SelectedTool({ tool: 'Brush' }))),
    Match.when('f', () => Option.some(Message.SelectedTool({ tool: 'Fill' }))),
    Match.when('e', () =>
      Option.some(Message.SelectedTool({ tool: 'Eraser' })),
    ),
    Match.orElse(() => Option.none()),
  )
}

const keyPresses = Stream.merge(
  Dom.streamFromEventFilterMapPreventDefault({
    target: document,
    type: 'keydown',
    filterMapEvent: toUndoRedoMessage,
  }),
  Dom.streamFromEventFilterMap({
    target: document,
    type: 'keydown',
    filterMapEvent: toToolMessage,
  }),
)

const mouseReleases = {
  dependencies: (model: Model) => model.isDrawing,
  stream: (isDrawing: boolean) =>
    isDrawing
      ? Stream.fromEventListener(document, 'mouseup').pipe(
          Stream.map(() => Message.ReleasedMouse()),
        )
      : Stream.empty,
}

// VIEW

type ApplicationViewBuilder = HtmlBuilder<Message>

const EMPTY_PREVIEW_POSITIONS: ReadonlyArray<readonly [number, number]> = []

const computeFillPreview = (
  grid: Grid,
  startX: number,
  startY: number,
  fillColorIndex: PaletteIndex,
): ReadonlyArray<readonly [number, number]> => {
  const filledGrid = floodFill(grid, startX, startY, fillColorIndex)
  const positions: Array<readonly [number, number]> = []
  Array.forEach(filledGrid, (row, y) => {
    Array.forEach(row, (cell, x) => {
      if (!Equal.equals(cell, grid[y]?.[x])) {
        positions.push([x, y])
      }
    })
  })
  return positions.length === 0 ? EMPTY_PREVIEW_POSITIONS : positions
}

const computePreviewPositions = (
  model: Model,
): ReadonlyArray<readonly [number, number]> => {
  if (model.isDrawing) {
    return EMPTY_PREVIEW_POSITIONS
  }
  return Option.match(model.maybeHoveredCell, {
    onNone: () => EMPTY_PREVIEW_POSITIONS,
    onSome: ({ x, y }) => {
      if (model.tool === 'Brush' || model.tool === 'Eraser') {
        return getMirroredPositions(x, y, model.gridSize, model.mirrorMode)
      }
      if (model.tool === 'Fill') {
        return computeFillPreview(model.grid, x, y, model.selectedColorIndex)
      }
      return EMPTY_PREVIEW_POSITIONS
    },
  })
}

const lazyRow = createKeyedLazy()

const rowView = (
  row: ReadonlyArray<Cell>,
  y: number,
  previewColor: HexColor,
  previewPositions: ReadonlyArray<readonly [number, number]>,
  theme: PaletteTheme,
  h: ApplicationViewBuilder,
): Html =>
  h.div(
    [h.Style({ display: 'flex', flex: '1' })],
    Array.map(row, (cell, x) => {
      const isPreview = previewPositions.some(
        ([previewX, previewY]) => previewX === x && previewY === y,
      )
      const displayColor = isPreview ? previewColor : resolveColor(cell, theme)

      return h.div([
        h.OnMouseDown(Message.PressedCell({ x, y })),
        h.OnMouseEnter(Message.EnteredCell({ x, y })),
        h.Style({
          flex: '1',
          backgroundColor: displayColor,
        }),
      ])
    }),
  )

const canvasView = (
  model: Model,
  theme: PaletteTheme,
  h: ApplicationViewBuilder,
): Html => {
  const previewPositions = computePreviewPositions(model)
  const previewColor =
    model.tool === 'Eraser'
      ? EMPTY_COLOR
      : (theme.colors[model.selectedColorIndex] ?? EMPTY_COLOR)

  return h.div(
    [
      h.Class(
        'flex flex-col items-center gap-4 min-w-0 self-start col-span-full min-[480px]:col-span-full md:col-span-1 -order-1 md:order-none',
      ),
    ],
    [
      h.div(
        [h.OnMouseLeave(Message.LeftCanvas()), h.Class('w-full max-w-lg')],
        [
          h.div(
            [
              h.Class('cursor-crosshair select-none w-full aspect-square'),
              h.Style({
                display: 'flex',
                'flex-direction': 'column',
                backgroundColor: '#ffffff',
              }),
            ],
            Array.map(model.grid, (row, y) => {
              const rowPreviewPositions = pipe(
                previewPositions,
                Array.filter(([, positionY]) => positionY === y),
                Array.match({
                  onEmpty: () => EMPTY_PREVIEW_POSITIONS,
                  onNonEmpty: filtered => filtered,
                }),
              )
              // oxlint-disable-next-line foldkit/no-array-index-view-keys -- a fixed positional grid; the row index is the stable identity
              return lazyRow(`${y}`, rowView, [
                row,
                y,
                previewColor,
                rowPreviewPositions,
                theme,
                h,
              ])
            }),
          ),
        ],
      ),
    ],
  )
}

const headerView = (header: Header): Html => header.view()

const toolbarView = (
  toolbar: Toolbar,
  mirrorMode: MirrorMode,
  tool: Tool,
  gridSize: number,
  selectedColorIndex: PaletteIndex,
  isCanvasEmpty: boolean,
  theme: PaletteTheme,
  paletteThemeIndex: number,
): Html =>
  toolbar.view({
    mirrorMode,
    tool,
    gridSize,
    selectedColorIndex,
    isCanvasEmpty,
    theme,
    paletteThemeIndex,
  })

const historyPanelView = (
  historyPanel: HistoryPanel,
  undoStack: ReadonlyArray<Grid>,
  redoStack: ReadonlyArray<Grid>,
  grid: Grid,
  gridSize: number,
  theme: PaletteTheme,
): Html => historyPanel.view({ undoStack, redoStack, grid, gridSize, theme })

const errorDialogView = (errorDialog: ErrorDialog): Html => errorDialog.view()

const gridSizeConfirmDialogView = (
  gridSizeConfirmDialog: GridSizeConfirmDialog,
): Html => gridSizeConfirmDialog.view()

const lazyHeader = createLazy()
const lazyToolbar = createLazy()
const lazyHistoryPanel = createLazy()
const lazyErrorDialog = createLazy()
const lazyGridSizeConfirmDialog = createLazy()

const contentView = (model: Model, h: ApplicationViewBuilder): Html => {
  const theme = currentPaletteTheme(model)

  return h.div(
    [
      h.Class(
        'flex-1 grid gap-6 p-4 md:p-6 grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-[auto_1fr_auto] md:justify-center md:items-start max-w-5xl mx-auto w-full',
      ),
    ],
    [
      lazyToolbar(toolbarView, [
        model.toolbar,
        model.mirrorMode,
        model.tool,
        model.gridSize,
        model.selectedColorIndex,
        isGridEmpty(model.grid),
        theme,
        model.paletteThemeIndex,
      ]),
      canvasView(model, theme, h),
      lazyHistoryPanel(historyPanelView, [
        model.historyPanel,
        model.undoStack,
        model.redoStack,
        model.isDrawing
          ? pipe(
              Array.last(model.undoStack),
              Option.getOrElse(() => model.grid),
            )
          : model.grid,
        model.gridSize,
        theme,
      ]),
    ],
  )
}

export const ApplicationLive = Application.make(
  Effect.fn(function* (_id, { flags }) {
    const store = yield* KeyValueStore.KeyValueStore

    const header = yield* new Header('header')
    const toolbar = yield* new Toolbar('toolbar')
    const historyPanel = yield* new HistoryPanel('historyPanel')
    const errorDialog = yield* new ErrorDialog('errorDialog')
    const gridSizeConfirmDialog = yield* new GridSizeConfirmDialog(
      'gridSizeConfirmDialog',
    )

    return {
      model: {
        grid: Option.match(flags.maybeSavedCanvas, {
          onNone: () => createEmptyGrid(DEFAULT_GRID_SIZE),
          onSome: savedCanvas => savedCanvas.grid,
        }),
        undoStack: [],
        redoStack: [],
        selectedColorIndex: Option.match(flags.maybeSavedCanvas, {
          onNone: () => DEFAULT_COLOR_INDEX,
          onSome: savedCanvas => savedCanvas.selectedColorIndex,
        }),
        gridSize: Option.match(flags.maybeSavedCanvas, {
          onNone: () => DEFAULT_GRID_SIZE,
          onSome: savedCanvas => savedCanvas.gridSize,
        }),
        tool: 'Brush',
        mirrorMode: 'None',
        isDrawing: false,
        maybeHoveredCell: Option.none(),
        paletteThemeIndex: Option.match(flags.maybeSavedCanvas, {
          onNone: () => DEFAULT_PALETTE_THEME_INDEX,
          onSome: savedCanvas => savedCanvas.paletteThemeIndex,
        }),
        header,
        toolbar,
        historyPanel,
        errorDialog,
        gridSizeConfirmDialog,
      },

      stream: keyPresses,

      subscriptions: { mouseReleases },

      update: {
        ...canvasUpdate,

        SelectedGridSize: (model, { size }) =>
          requestGridSizeChangeStep(model, size),

        FailedExportPng: (model, { error }) => ({
          model,
          messages: [
            model.errorDialog.send(
              ErrorDialog.Message.RequestedShowError({ error }),
            ),
          ],
        }),

        ...header.on({ ClickedExport: exportStep }),

        ...toolbar.on({
          SelectedTool: (model, { tool }) => selectToolStep(model, tool),
          SelectedGridSize: (model, { size }) =>
            requestGridSizeChangeStep(model, size),
          SelectedColor: (model, { colorIndex }) =>
            selectColorStep(model, colorIndex),
          SelectedPaletteTheme: (model, { themeIndex }) =>
            selectPaletteThemeStep(model, themeIndex),
          ToggledMirrorHorizontal: toggleMirrorHorizontalStep,
          ToggledMirrorVertical: toggleMirrorVerticalStep,
          ClickedClear: clearCanvasStep,
        }),

        ...historyPanel.on({
          ClickedUndo: canvasUpdate.ClickedUndo,
          ClickedRedo: canvasUpdate.ClickedRedo,
          ClickedHistoryStep: (model, { stepIndex }) =>
            restoreHistoryStep(model, stepIndex),
          ClickedRedoStep: (model, { stepIndex }) =>
            restoreRedoStep(model, stepIndex),
        }),

        ...gridSizeConfirmDialog.on({
          ConfirmedGridSizeChange: (model, { size }) => {
            const nextModel = applyGridSizeChange(model, size)

            return { model: nextModel, commands: [saveCanvas(nextModel)] }
          },
        }),
      },

      commands: {
        SaveCanvas: canvas => writeCanvas(store, canvas),
        ExportPng: exportPng,
      },

      view: (model, h) => ({
        title: 'Pixel Art',
        body: h.div(
          [h.Class('min-h-screen bg-gray-900 text-gray-100 flex flex-col')],
          [
            lazyHeader(headerView, [model.header]),
            contentView(model, h),
            lazyErrorDialog(errorDialogView, [model.errorDialog]),
            lazyGridSizeConfirmDialog(gridSizeConfirmDialogView, [
              model.gridSizeConfirmDialog,
            ]),
          ],
        ),
      }),
    }
  }),
)
