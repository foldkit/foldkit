const SaveCanvas = Command.define('SaveCanvas', CompletedSaveCanvas)

const saveCanvas = (model: Model) =>
  SaveCanvas(
    Effect.gen(function* () {
      const store = yield* KeyValueStore.KeyValueStore
      yield* store.set(STORAGE_KEY, encode(model))
      return CompletedSaveCanvas()
    }).pipe(
      Effect.catchAll(() => Effect.succeed(CompletedSaveCanvas())),
      Effect.provide(BrowserKeyValueStore.layerLocalStorage),
    ),
  )

const ExportPng = Command.define(
  'ExportPng',
  SucceededExportPng,
  FailedExportPng,
)

const exportPng = (grid: Grid, gridSize: number, theme: PaletteTheme) =>
  ExportPng(
    Effect.gen(function* () {
      const context = yield* getCanvasContext(gridSize)
      paintGrid(context, grid, theme)
      downloadAsPng(context)
      return SucceededExportPng()
    }).pipe(
      Effect.catchTag('FailedExportPng', Effect.succeed),
      Effect.catchAll(() =>
        Effect.succeed(FailedExportPng({ error: 'Failed to export image' })),
      ),
    ),
  )
