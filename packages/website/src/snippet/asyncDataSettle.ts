const LoadAllNotes = ApplicationBlock.makeCommand('LoadAllNotes', {
  messages: [SettledLoadAllNotes],
  handler: function* () {
    return () =>
      pipe(
        fetchAllNotes,
        Effect.result,
        Effect.map(result => SettledLoadAllNotes({ result })),
      )
  },
})

const update = ApplicationComposition.makeUpdate({
  SettledLoadAllNotes: ApplicationBlock.makeFieldsStep.fromMessage(
    ({ result }) => ({
      allNotes: previous => AsyncData.settle(previous, result),
    }),
  ),
})
