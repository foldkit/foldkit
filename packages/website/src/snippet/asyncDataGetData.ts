export const noteNotebookId = (
  model: Model,
  noteId: NoteId,
): Option.Option<NotebookId> =>
  pipe(
    model.noteById,
    HashMap.get(noteId),
    Option.flatMap(noteEntry => AsyncData.getData(noteEntry)),
    Option.flatMap(note => note.maybeNotebookId),
  )
