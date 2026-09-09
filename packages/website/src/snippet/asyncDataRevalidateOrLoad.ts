const enterNotebooksRoute = (model: Model): Update.Return<Model, Message> =>
  Option.match(AsyncData.revalidateOrLoad(model.notebooks), {
    onNone: () => ({ model }),
    onSome: nextNotebooks => ({
      model: evo(model, { notebooks: () => nextNotebooks }),
      commands: [LoadNotebooks()],
    }),
  })
