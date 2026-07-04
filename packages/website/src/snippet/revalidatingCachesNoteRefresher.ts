export const refreshNote = (noteId: NoteId): Refresher =>
  Update.refresh({
    read: model => HashMap.get(model.noteById, noteId),
    revalidate: AsyncData.revalidate,
    write: (model, note) =>
      evo(model, {
        noteById: byId => HashMap.set(byId, noteId, note),
      }),
    load: LoadNote({ id: noteId }),
  })
