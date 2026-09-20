const LoadAllNotes = Command.define('LoadAllNotes', {
  messages: [SucceededLoadAllNotes, FailedLoadAllNotes],
  execute: pipe(
    fetchAllNotes,
    Effect.match({
      onSuccess: notes => SucceededLoadAllNotes({ notes }),
      onFailure: error => FailedLoadAllNotes({ error }),
    }),
  ),
})

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
})
