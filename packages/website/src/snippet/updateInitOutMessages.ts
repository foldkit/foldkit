import { ApplicationBlock, makeFieldsStep } from './definition'

const foldSearchOutMessage = ApplicationBlock.makeOutMessageFold(
  Search.SearchBlock,
  {
    RestoredQuery: ({ query }) =>
      makeFieldsStep(() => ({
        maybeRestoredQuery: () => Option.some(query),
      })),
  },
)

const foldEditorOutMessage = ApplicationBlock.makeOutMessageFold(
  Editor.EditorBlock,
  {
    RestoredDraft: ({ documentId }) =>
      makeFieldsStep(() => ({
        maybeRestoredDocumentId: () => Option.some(documentId),
      })),
  },
)

const SearchBinding = ApplicationBlock.makeBinding(Search.SearchBlock, {
  field: 'search',
}).withOutMessagePolicy({ fold: foldSearchOutMessage })

const EditorBinding = ApplicationBlock.makeBinding(Editor.EditorBlock, {
  field: 'editor',
}).withOutMessagePolicy({ fold: foldEditorOutMessage })

const ApplicationComposition = ApplicationBlock.makeComposition({
  bindings: [SearchBinding, EditorBinding],
})

const init = ApplicationComposition.makeInit(() => ({
  model: {
    maybeRestoredQuery: Option.none(),
    maybeRestoredDocumentId: Option.none(),
  },
  steps: [SearchBinding.requestRestore(), EditorBinding.requestRestore()],
}))
