const SaveCanvas = Command.define(
  'SaveCanvas',
  { model: Model },
  CompletedSaveCanvas,
)(({ model }) =>
  Effect.gen(function* () {
    const store = yield* KeyValueStore.KeyValueStore
    yield* store.set(STORAGE_KEY, encode(model))
    return CompletedSaveCanvas()
  }).pipe(
    Effect.catch(() => Effect.succeed(CompletedSaveCanvas())),
    Effect.provide(BrowserKeyValueStore.layerLocalStorage),
  ),
)

const ExportPng = Command.define(
  'ExportPng',
  { grid: Grid, gridSize: S.Number, theme: PaletteTheme },
  SucceededExportPng,
  FailedExportPng,
)(({ grid, gridSize, theme }) =>
  Effect.gen(function* () {
    const context = yield* getCanvasContext(gridSize)
    paintGrid(context, grid, theme)
    downloadAsPng(context)
    return SucceededExportPng()
  }).pipe(
    Effect.catchTag('FailedExportPng', Effect.succeed),
    Effect.catch(() =>
      Effect.succeed(FailedExportPng({ error: 'Failed to export image' })),
    ),
  ),
)
