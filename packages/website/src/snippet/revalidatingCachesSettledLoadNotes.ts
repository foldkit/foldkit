M.tagsExhaustive({
  SettledLoadNotes: ({ notebookId, result }) => [
    evo(model, {
      notesByNotebook: byNotebook =>
        HashMap.modify(byNotebook, notebookId, previous =>
          AsyncData.settle(previous, result),
        ),
    }),
    [],
  ],
})
