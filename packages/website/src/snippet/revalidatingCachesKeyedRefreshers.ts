const refreshNotesForNotebook = (notebookId: NotebookId): Refresher =>
  Update.refresh({
    read: model => HashMap.get(model.notesByNotebook, notebookId),
    revalidate: AsyncData.revalidate,
    write: (model, notes) =>
      evo(model, {
        notesByNotebook: byNotebook =>
          HashMap.set(byNotebook, notebookId, notes),
      }),
    load: LoadNotes({ notebookId }),
  })

export const refreshNotebookNotes = (
  maybeNotebookId: Option.Option<NotebookId>,
): Refresher =>
  Option.match(maybeNotebookId, {
    onNone: () => Update.noOp,
    onSome: refreshNotesForNotebook,
  })
