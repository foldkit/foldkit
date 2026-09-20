const OutMessage = defineMessageUnion({
  RestoredSearch: { query: Schema.String },
  RestoredEditor: { documentId: Schema.String },
  RestoredWorkspace: {
    maybeQuery: Schema.Option(Schema.String),
    maybeDocumentId: Schema.Option(Schema.String),
  },
})

const toParentSearchOutMessage = Search.OutMessage.match({
  RestoredQuery: ({ query }) => OutMessage.RestoredSearch({ query }),
})

const toParentEditorOutMessage = Editor.OutMessage.match({
  RestoredDraft: ({ documentId }) => OutMessage.RestoredEditor({ documentId }),
})

return Update.foldChildInits(
  {
    search: Search.boot(),
    editor: Editor.boot(),
  },
  {
    toParentModel: ({ search, editor }) => Model.make({ search, editor }),
    folds: {
      search: {
        toParentMessage: message => Message.GotSearchMessage({ message }),
        toParentOutMessage: toParentSearchOutMessage,
      },
      editor: {
        toParentMessage: message => Message.GotEditorMessage({ message }),
        toParentOutMessage: toParentEditorOutMessage,
      },
    },
    resolveOutMessage: ({ search, editor }) =>
      OutMessage.RestoredWorkspace({
        maybeQuery: pipe(
          Option.fromNullishOr(search),
          Option.map(outMessage =>
            Match.value(outMessage).pipe(
              Match.tagsExhaustive({
                RestoredSearch: ({ query }) => query,
              }),
            ),
          ),
        ),
        maybeDocumentId: pipe(
          Option.fromNullishOr(editor),
          Option.map(outMessage =>
            Match.value(outMessage).pipe(
              Match.tagsExhaustive({
                RestoredEditor: ({ documentId }) => documentId,
              }),
            ),
          ),
        ),
      }),
  },
)
