const LoadAllNotes = ApplicationDefinition.makeCommand('LoadAllNotes', {
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
  SettledLoadAllNotes: ApplicationDefinition.makeFieldsStep.fromMessage(
    ({ result }) => ({
      allNotes: previous => AsyncData.settle(previous, result),
    }),
  ),
})
