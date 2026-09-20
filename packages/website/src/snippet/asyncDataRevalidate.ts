const revalidateAllNotes = (model: Model): Update.Return<Model, Message> =>
  Option.match(AsyncData.revalidate(model.allNotes), {
    onNone: () => ({ model }),
    onSome: refreshingAllNotes => ({
      model: modifyFields(model, { allNotes: () => refreshingAllNotes }),
      commands: [LoadAllNotes()],
    }),
  })
