return Update.foldChildInit(Dialog.boot({ id: 'confirm' }), {
  toParentModel: dialog => ({ dialog }),
  toParentMessage: toGotDialogMessage,
  foldOutMessage: foldDialogOutMessage,
})
