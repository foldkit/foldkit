const LoadAllNotes = Application.command('LoadAllNotes', {
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

const update = ApplicationComposition.makeUpdate((model, message) =>
  Match.value(message).pipe(
    Match.tagsExhaustive({
      SettledLoadAllNotes: ({ result }) => ({
        model: modifyFields(model, {
          allNotes: previous => AsyncData.settle(previous, result),
        }),
      }),
    }),
  ),
)
