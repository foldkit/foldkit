const LoadAllNotes = Command.define('LoadAllNotes', {
  messages: [SettledLoadAllNotes],
  execute: pipe(
    fetchAllNotes,
    Effect.result,
    Effect.map(result => SettledLoadAllNotes({ result })),
  ),
})

Match.tagsExhaustive({
  SettledLoadAllNotes: ({ result }) => ({
    model: modifyFields(model, {
      allNotes: previous => AsyncData.settle(previous, result),
    }),
  }),
})
