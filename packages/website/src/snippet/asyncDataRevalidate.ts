const revalidateAllNotes = Update.makeStep((model: Model) =>
  Option.match(AsyncData.revalidate(model.allNotes), {
    onNone: () => ({ model }),
    onSome: refreshingAllNotes => ({
      model: modifyFields(model, { allNotes: () => refreshingAllNotes }),
      commands: [LoadAllNotes()],
    }),
  }),
)
