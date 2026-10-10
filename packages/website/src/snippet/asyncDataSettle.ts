const LoadAllNotes = Command.define('LoadAllNotes', {
  messages: [SettledLoadAllNotes],
})

const LoadAllNotesLayer = LoadAllNotes.toLayer(
  Effect.succeed(() =>
    pipe(
      fetchAllNotes,
      Effect.result,
      Effect.map(result => SettledLoadAllNotes({ result })),
    ),
  ),
)

Match.tagsExhaustive({
  SettledLoadAllNotes: ({ result }) => ({
    model: modifyFields(model, {
      allNotes: previous => AsyncData.settle(previous, result),
    }),
  }),
})
