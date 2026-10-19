const init = () =>
  Update.foldChildInits(
    { search: Search.boot(), editor: Editor.boot() },
    {
      toParentModel: ({ search, editor }) => Model.make({ search, editor }),
      folds: {
        search: {
          toParentMessage: message => Message.GotSearchMessage({ message }),
          foldOutMessage: foldSearchOutMessage,
        },
        editor: {
          toParentMessage: message => Message.GotEditorMessage({ message }),
          foldOutMessage: foldEditorOutMessage,
        },
      },
    },
  )
