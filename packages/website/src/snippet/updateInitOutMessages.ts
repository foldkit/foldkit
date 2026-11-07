import {
  makeFieldsStep,
  makeOutMessageFold,
  makeRequiredFieldBinding,
  makeComposition,
} from './block'

const SearchBinding = makeRequiredFieldBinding(Search.SearchBlock, {
  field: 'search',
}).withOutMessagePolicy({
  fold: makeOutMessageFold(Search.SearchBlock, {
    RestoredQuery: ({ query }) =>
      makeFieldsStep(() => ({
        maybeRestoredQuery: () => Option.some(query),
      })),
  }),
})

const EditorBinding = makeRequiredFieldBinding(Editor.EditorBlock, {
  field: 'editor',
}).withOutMessagePolicy({
  fold: makeOutMessageFold(Editor.EditorBlock, {
    RestoredDraft: ({ documentId }) =>
      makeFieldsStep(() => ({
        maybeRestoredDocumentId: () => Option.some(documentId),
      })),
  }),
})

const ApplicationComposition = makeComposition({
  bindings: [SearchBinding, EditorBinding],
})

const init = ApplicationComposition.makeInit(() => ({
  model: {
    maybeRestoredQuery: Option.none(),
    maybeRestoredDocumentId: Option.none(),
  },
  steps: [SearchBinding.requestRestore(), EditorBinding.requestRestore()],
}))
