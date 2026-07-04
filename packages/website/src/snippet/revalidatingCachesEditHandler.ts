const handleEditNoteOutMessage = (
  model: Model,
  outMessage: EditNoteDialog.Message.OutMessage,
): UpdateReturn =>
  M.value(outMessage).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      UpdatedNote: ({ note }) => {
        const previousNotebookId = noteNotebookId(model, note.id)
        const hasMoved = !Option.makeEquivalence(String.Equivalence)(
          previousNotebookId,
          note.maybeNotebookId,
        )
        return pipe(
          model,
          replaceNoteInCaches(note),
          Update.combine([
            refreshNote(note.id),
            refreshAllNotes,
            refreshNotebookNotes(note.maybeNotebookId),
            ...(hasMoved ? [refreshNotebookNotes(previousNotebookId)] : []),
            showToast('Success', `Updated ${note.title}`),
          ]),
        )
      },
    }),
  )
