const foldDialogOpen = Update.foldChildStep({
  // Wrong: the parent constructs one of Dialog's internal Messages.
  update: (dialog: Dialog.Model) =>
    Dialog.update(dialog, Dialog.Message.RequestedOpen()),
  read: readDialog,
  write: writeDialog,
  toParentMessage: toGotDialogMessage,
  foldOutMessage: foldDialogOutMessage,
})
