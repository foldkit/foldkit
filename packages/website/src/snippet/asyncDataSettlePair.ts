const LoadAllNotes = ApplicationDefinition.makeCommand('LoadAllNotes', {
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

const update = ApplicationComposition.makeUpdate({
  SucceededLoadAllNotes: ApplicationDefinition.makeFieldsStep.fromMessage(
    ({ notes }) => ({
      allNotes: () => AsyncData.Success({ data: notes }),
    }),
  ),
  FailedLoadAllNotes: ApplicationDefinition.makeFieldsStep.fromMessage(
    ({ error }) => ({
      allNotes: () => AsyncData.Failure({ error }),
    }),
  ),
})
