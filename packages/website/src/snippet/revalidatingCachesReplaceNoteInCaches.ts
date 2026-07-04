export const replaceNoteInCaches =
  (note: Note) =>
  (model: Model): Model =>
    evo(model, {
      notesByNotebook: byNotebook =>
        Option.match(note.maybeNotebookId, {
          onNone: () => byNotebook,
          onSome: notebookId =>
            HashMap.modify(byNotebook, notebookId, notes =>
              AsyncData.map(notes, noteList =>
                Note.replaceById(noteList, note),
              ),
            ),
        }),
      noteById: byId =>
        HashMap.set(byId, note.id, AsyncData.Success({ data: note })),
      allNotes: allNotes =>
        AsyncData.map(allNotes, noteList => Note.replaceById(noteList, note)),
    })
