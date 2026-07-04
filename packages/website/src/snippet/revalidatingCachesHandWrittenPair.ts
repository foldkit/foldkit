M.tagsExhaustive({
  SucceededLoadAllNotes: ({ notes }) => [
    evo(model, { allNotes: () => AsyncData.Success({ data: notes }) }),
    [],
  ],

  FailedLoadAllNotes: ({ error }) => [
    evo(model, { allNotes: () => AsyncData.Failure({ error }) }),
    [],
  ],
})
