const LoadAllNotes = Application.command('LoadAllNotes', {
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

const update = ApplicationComposition.makeUpdate((model, message) =>
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
