export const prependNewNote =
  (note: Note) =>
  (model: Model): Model =>
    Option.match(note.maybeNotebookId, {
      onNone: () =>
        evo(model, {
          allNotes: allNotes =>
            AsyncData.map(allNotes, noteList => Array.prepend(noteList, note)),
        }),
      onSome: notebookId =>
        evo(model, {
          notesByNotebook: byNotebook =>
            HashMap.modify(byNotebook, notebookId, notes =>
              AsyncData.map(notes, noteList => Array.prepend(noteList, note)),
            ),
        }),
    })
