const revalidateAllNotesStep = ApplicationDefinition.makeStep(model =>
  Option.match(AsyncData.revalidate(model.allNotes), {
    onNone: () => ({ model }),
    onSome: refreshingAllNotes => ({
      model: modifyFields(model, { allNotes: () => refreshingAllNotes }),
      commands: [LoadAllNotes()],
    }),
  }),
)
