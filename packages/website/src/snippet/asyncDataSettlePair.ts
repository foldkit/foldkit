import { makeCommand, makeFieldsStep } from './block'

const LoadAllNotes = makeCommand('LoadAllNotes', {
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
  SucceededLoadAllNotes: makeFieldsStep.fromMessage(({ notes }) => ({
    allNotes: () => AsyncData.Success({ data: notes }),
  })),
  FailedLoadAllNotes: makeFieldsStep.fromMessage(({ error }) => ({
    allNotes: () => AsyncData.Failure({ error }),
  })),
})
