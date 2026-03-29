const SaveCanvas = Command.define('SaveCanvas', CompletedSaveCanvas)

const saveCanvas = (model: Model) =>
  SaveCanvas(
    Effect.gen(function* () {
      const store = yield* KeyValueStore.KeyValueStore
      const data: SavedCanvas = {
        grid: model.grid,
        gridSize: model.gridSize,
        paletteThemeIndex: model.paletteThemeIndex,
        selectedColorIndex: model.selectedColorIndex,
      }
      yield* store.set(
        STORAGE_KEY,
        S.encodeSync(S.parseJson(SavedCanvasSchema))(data),
      )
      return CompletedSaveCanvas()
    }).pipe(
      Effect.catchAll(() => Effect.succeed(CompletedSaveCanvas())),
      Effect.provide(BrowserKeyValueStore.layerLocalStorage),
    ),
  )
