// The Schema is the single source of truth. The decoder and the
// encoder both fall out of it. They cannot drift apart.

export const SavedCanvas = Schema.Struct({
  grid: SavedGrid,
  gridSize: Schema.Number,
  paletteThemeIndex: Schema.Number,
  selectedColorIndex: PaletteIndex,
})

export const SavedCanvasJsonString = Schema.fromJsonString(
  Schema.toCodecJson(SavedCanvas),
)

export const flags: Effect.Effect<Flags> = Effect.gen(function* () {
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
  Effect.provide(BrowserKeyValueStore.layerLocalStorage),
)

// Saving goes through the same Schema:
// Schema.encodeSync(SavedCanvasJsonString)(data)
