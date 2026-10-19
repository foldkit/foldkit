const foldSearchOutMessage = Search.OutMessage.match<
  Update.Step<Model, Message>
>({
  PreparedResults:
    ({ documentId }) =>
    model => ({
      model: modifyFields(model, {
        maybeSelectedDocumentId: () => Option.some(documentId),
      }),
    }),
})

const foldEditorOutMessage = Editor.OutMessage.match<
  Update.Step<Model, Message>
>({
  OpenedDocument:
    ({ documentId }) =>
    model => ({
      model: modifyFields(model, {
        maybeOpenedDocumentId: () => Option.some(documentId),
      }),
    }),
})

return Update.foldChildInits(
  {
    search: Search.boot(),
    editor: Editor.boot(),
  },
  {
    toParentModel: ({ search, editor }) =>
      Model.make({
        search,
        editor,
        maybeSelectedDocumentId: Option.none(),
        maybeOpenedDocumentId: Option.none(),
      }),
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
