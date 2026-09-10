const foldDialogOpen = Update.foldChildStep({
  // Right: the parent calls an update function owned by Dialog.
  update: Dialog.open,
  read: readDialog,
  write: writeDialog,
  toParentMessage: toGotDialogMessage,
  foldOutMessage: foldDialogOutMessage,
})
