const handleCreateNoteOutMessage = (
  model: Model,
  outMessage: CreateNoteDialog.Message.OutMessage,
): UpdateReturn =>
  M.value(outMessage).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      CreatedNote: ({ note }) =>
        pipe(
          model,
          prependNewNote(note),
          Update.combine([
            refreshAllNotes,
            refreshNotebookNotes(note.maybeNotebookId),
            showToast('Success', `Added ${note.title}`),
          ]),
        ),
    }),
  )
