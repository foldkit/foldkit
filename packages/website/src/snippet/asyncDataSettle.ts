import { makeCommand, makeFieldsStep } from './block'

const LoadAllNotes = makeCommand('LoadAllNotes', {
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
  SettledLoadAllNotes: makeFieldsStep.fromMessage(({ result }) => ({
    allNotes: previous => AsyncData.settle(previous, result),
  })),
})
