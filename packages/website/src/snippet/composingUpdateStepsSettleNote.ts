const settleNote =
  (noteId: NoteId, result: Result.Result<Note, string>) =>
  (model: Model): UpdateReturn => [
    evo(model, {
      noteById: byId =>
        HashMap.modify(byId, noteId, previous =>
          AsyncData.settle(previous, result),
        ),
    }),
    [],
  ]
