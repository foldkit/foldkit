const enterNotebooksRouteStep = ApplicationDefinition.makeStep(model =>
  Option.match(AsyncData.revalidateOrLoad(model.notebooks), {
    onNone: () => ({ model }),
    onSome: nextNotebooks => ({
      model: modifyFields(model, { notebooks: () => nextNotebooks }),
      commands: [LoadNotebooks()],
    }),
  }),
)
