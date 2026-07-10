const SaveCanvas = Command.define(
  'SaveCanvas',
  {
    grid: Grid,
    gridSize: S.Number,
    paletteThemeIndex: S.Number,
    selectedColorIndex: PaletteIndex,
  },
  CompletedSaveCanvas,
)(({ grid, gridSize, paletteThemeIndex, selectedColorIndex }) =>
  Effect.gen(function* () {
    const store = yield* KeyValueStore.KeyValueStore
    const data: SavedCanvas = {
      grid,
      gridSize,
      paletteThemeIndex,
      selectedColorIndex,
    }
    yield* store.set(STORAGE_KEY, S.encodeSync(SavedCanvasJsonString)(data))
    return CompletedSaveCanvas()
  }).pipe(
    Effect.catch(() => Effect.succeed(CompletedSaveCanvas())),
    Effect.provide(BrowserKeyValueStore.layerLocalStorage),
  ),
)

const ExportPng = Command.define(
  'ExportPng',
  { grid: Grid, gridSize: S.Number, paletteThemeIndex: S.Number },
  SucceededExportPng,
  FailedExportPng,
)(({ grid, gridSize, paletteThemeIndex }) =>
  Effect.gen(function* () {
    const theme = PALETTE_THEMES[paletteThemeIndex] ?? PALETTE_THEMES[0]
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')

    if (Predicate.isNull(context)) {
      return yield* Effect.fail(
        FailedExportPng({ error: 'Canvas 2D context not available' }),
      )
    }

    // ... paint each cell, then click a generated download link

    return SucceededExportPng()
  }).pipe(
    Effect.catchTag('FailedExportPng', error => Effect.succeed(error)),
    Effect.catch(() =>
      Effect.succeed(FailedExportPng({ error: 'Failed to export image' })),
    ),
  ),
)
