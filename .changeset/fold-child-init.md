---
'foldkit': minor
'create-foldkit-app': patch
---

Add `Update.foldChildInit` and `Update.foldChildInits` to construct a parent Model from child init or boot results, map their Commands, and handle their OutMessages. Both APIs take the child results first. Existing initialization code remains valid; adopting these helpers is optional.

### One child

For example, a Workspace Submodel contains a Search Submodel. Previously, the Workspace Submodel constructed its Model and mapped the Search Submodel's Commands separately:

```ts
const searchInit = Search.init()

return {
  model: Model.make({ search: searchInit.model }),
  commands: Command.mapMessages(searchInit.commands, message =>
    Message.GotSearchMessage({ message }),
  ),
}
```

Now, `foldChildInit` does both:

```ts
return Update.foldChildInit(Search.init(), {
  toParentModel: search => Model.make({ search }),
  toParentMessage: message => Message.GotSearchMessage({ message }),
})
```

If the Search Submodel emits an OutMessage, the Workspace Submodel must handle it. Supply `foldOutMessage` to update the Workspace Submodel's Model or return Commands in response. Supply `toParentOutMessage` to translate it into the Workspace Submodel's OutMessage type for its own parent. Both can be supplied when the event should be handled locally and reported upward.

### Several children

For a Workspace Submodel containing Search and Editor Submodels, the previous initialization code assembled both Models and mapped both sets of Commands:

```ts
const searchInit = Search.init()
const editorInit = Editor.init()

return {
  model: Model.make({ search: searchInit.model, editor: editorInit.model }),
  commands: [
    ...Command.mapMessages(searchInit.commands, message =>
      Message.GotSearchMessage({ message }),
    ),
    ...Command.mapMessages(editorInit.commands, message =>
      Message.GotEditorMessage({ message }),
    ),
  ],
}
```

Now, `foldChildInits` keeps the same wiring together:

```ts
return Update.foldChildInits(
  { search: Search.init(), editor: Editor.init() },
  {
    toParentModel: ({ search, editor }) => Model.make({ search, editor }),
    folds: {
      search: {
        toParentMessage: message => Message.GotSearchMessage({ message }),
      },
      editor: {
        toParentMessage: message => Message.GotEditorMessage({ message }),
      },
    },
  },
)
```

### Handling child OutMessages locally

Each entry also accepts `foldOutMessage`. For example, a Workspace Submodel contains Search and Editor Submodels whose boot results can report `PreparedResults` and `OpenedDocument`. The Workspace Submodel handles both locally to record the selected and opened document IDs:

```ts
const foldSearchOutMessage = Search.OutMessage.match<
  Update.Step<Model, Message>
>({
  PreparedResults:
    ({ documentId }) =>
    model => ({
      model: evo(model, {
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
      model: evo(model, {
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
```

Foldkit constructs the complete parent Model once, then runs the handlers in the order of the named fields in `folds`. The Editor fold receives the Model produced by the Search fold, so it keeps `maybeSelectedDocumentId` when setting `maybeOpenedDocumentId`. A child that emits no OutMessage skips its handler. These folds handle the OutMessages locally, so no `resolveOutMessage` is needed. Commands run independently; a later child's Commands do not wait for an earlier child's Commands to finish.

### Combining child OutMessages

For example, App contains a Workspace Submodel, which contains Search and Editor Submodels. The Search and Editor Submodels' boot functions can report that they restored a saved query or draft. App should receive one restoration notice containing both results.

The Workspace Submodel translates its children's OutMessages with `toParentOutMessage`. The same adapters can report an individual restoration during a later update. During boot, `resolveOutMessage` combines them into a single `RestoredWorkspace` OutMessage for App:

```ts
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
```

When both children report a restoration, the OutMessage preserves both values. When only one does, the other field is `None`. When neither does, the resolver is skipped and the result has no `outMessage`.

The resolver receives the emitted OutMessages under their child keys and the final parent Model as a second argument. This preserves boot-time information that the current Model may not retain, such as whether an existing query was restored. If the Model already contains everything needed for the parent's OutMessage, handle the children locally and attach that OutMessage afterward with `Update.withOutMessage`.

Newly generated apps also include guidance for both initialization helpers in `FOLDKIT.md`.
