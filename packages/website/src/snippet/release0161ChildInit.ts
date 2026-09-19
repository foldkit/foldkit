const init = () =>
  Update.foldChildInit(Search.boot(), {
    toParentModel: search => Model.make({ search }),
    toParentMessage: message => Message.GotSearchMessage({ message }),
    foldOutMessage: foldSearchOutMessage,
  })
