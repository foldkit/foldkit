const revalidateAllNotes = Update.defineStep((model: Model) =>
  Option.match(AsyncData.revalidate(model.allNotes), {
    onNone: () => ({ model }),
    onSome: refreshingAllNotes => ({
      model: modifyFields(model, { allNotes: () => refreshingAllNotes }),
      commands: [LoadAllNotes()],
    }),
  }),
)
