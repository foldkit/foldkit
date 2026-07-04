M.tagsExhaustive({
  SettledLoadAllNotes: ({ result }) => [
    evo(model, { allNotes: previous => AsyncData.settle(previous, result) }),
    [],
  ],
})
