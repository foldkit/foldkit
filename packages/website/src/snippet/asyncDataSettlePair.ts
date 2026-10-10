const LoadAllNotes = Command.define('LoadAllNotes', {
  messages: [SucceededLoadAllNotes, FailedLoadAllNotes],
  handler: function* () {
    return () =>
      pipe(
        fetchAllNotes,
        Effect.match({
          onSuccess: notes => SucceededLoadAllNotes({ notes }),
          onFailure: error => FailedLoadAllNotes({ error }),
        }),
      )
  },
})

const update = Update.make((model: Model, message: Message) =>
  Match.value(message).pipe(
    Match.tagsExhaustive({
      SucceededLoadAllNotes: ({ notes }) => ({
        model: modifyFields(model, {
          allNotes: () => AsyncData.Success({ data: notes }),
        }),
      }),
      FailedLoadAllNotes: ({ error }) => ({
        model: modifyFields(model, {
          allNotes: () => AsyncData.Failure({ error }),
        }),
      }),
    }),
  ),
)
