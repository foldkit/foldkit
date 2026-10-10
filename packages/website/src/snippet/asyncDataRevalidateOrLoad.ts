const enterNotebooksRoute = Update.makeStep((model: Model) =>
  Option.match(AsyncData.revalidateOrLoad(model.notebooks), {
    onNone: () => ({ model }),
    onSome: nextNotebooks => ({
      model: modifyFields(model, { notebooks: () => nextNotebooks }),
      commands: [LoadNotebooks()],
    }),
  }),
)
