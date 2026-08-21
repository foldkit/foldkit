const LoadAllNotes = Command.define('LoadAllNotes', {
  messages: [SettledLoadAllNotes],
  execute: pipe(
    fetchAllNotes,
    Effect.result,
    Effect.map(result => SettledLoadAllNotes({ result })),
  ),
})

M.tagsExhaustive({
  SettledLoadAllNotes: ({ result }) => ({
    model: evo(model, {
      allNotes: previous => AsyncData.settle(previous, result),
    }),
  }),
})
