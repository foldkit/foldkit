const BoardSnapshot = Schema.Struct({
  state: OrderBoard,
  cursor: Schema.Number,
})

const Flags = Schema.Struct({
  maybeBoardSnapshot: Schema.Option(BoardSnapshot),
})

const init = ApplicationComposition.makeInit((flags: typeof Flags.Type) => ({
  model: { pendingIntentIds: [] },
  // A snapshot starts the feed as Success and resumes after its cursor.
  steps: [
    BoardBinding.requestWatch({
      args: { boardId: 'kitchen' },
      maybeSnapshot: flags.maybeBoardSnapshot,
    }),
  ],
}))
