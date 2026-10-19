return Update.foldChildInit(Home.init(), {
  toParentModel: home => ({ home }),
  toParentMessage: message => Message.GotHomeMessage({ message }),
})
