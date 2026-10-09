const SaveCanvas = Command.define('SaveCanvas', {
  args: {
    grid: Grid,
    gridSize: Schema.Number,
    paletteThemeIndex: Schema.Number,
    selectedColorIndex: PaletteIndex,
  },
  messages: [Message.CompletedSaveCanvas],
  execute: ({ grid, gridSize, paletteThemeIndex, selectedColorIndex }) =>
    Effect.gen(function* () {
      const store = yield* KeyValueStore.KeyValueStore
      const data: SavedCanvas = {
        grid,
        gridSize,
        paletteThemeIndex,
        selectedColorIndex,
      }
      const encodedCanvas = yield* Schema.encodeEffect(SavedCanvasJsonString)(
        data,
      )
      yield* store.set(STORAGE_KEY, encodedCanvas)
      return Message.CompletedSaveCanvas()
    }).pipe(Effect.catch(() => Effect.succeed(Message.CompletedSaveCanvas()))),
})

const ExportPng = Command.define('ExportPng', {
  args: {
    grid: Grid,
    gridSize: Schema.Number,
    paletteThemeIndex: Schema.Number,
  },
  messages: [Message.SucceededExportPng, Message.FailedExportPng],
  execute: ({ grid, gridSize, paletteThemeIndex }) =>
    Effect.gen(function* () {
      const theme = PALETTE_THEMES[paletteThemeIndex] ?? PALETTE_THEMES[0]
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')

      if (Predicate.isNull(context)) {
        return yield* Effect.fail(
          Message.FailedExportPng({ error: 'Canvas 2D context not available' }),
        )
      }

      // ... paint each cell, then click a generated download link

      return Message.SucceededExportPng()
    }).pipe(Effect.catchTag('FailedExportPng', error => Effect.succeed(error))),
})
