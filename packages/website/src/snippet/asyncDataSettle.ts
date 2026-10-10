const LoadAllNotes = Command.define('LoadAllNotes', {
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

const update = Update.make((model: Model, message: Message) =>
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
