Story.story(
  update,
  Story.with(openEditDialogModel),
  Story.message(
    GotEditNoteMessage({
      message: EditNoteDialog.Message.SucceededUpdate({ note: movedNote }),
    }),
  ),
  Story.model(model => {
    expect(entryFor(model, notebookId)._tag).toBe('Refreshing')
    expect(viewedNote(model)._tag).toBe('Refreshing')
    expect(model.editNoteDialog.dialog.isOpen).toBe(false)
  }),
  resolveCloseDialog,
  Story.Command.resolve(
    LoadNote,
    SettledLoadNote({ id: movedNote.id, result: Result.succeed(movedNote) }),
  ),
  Story.Command.resolve(
    LoadNotes,
    SettledLoadNotes({ notebookId, result: Result.succeed([]) }),
  ),
  // ...
)
