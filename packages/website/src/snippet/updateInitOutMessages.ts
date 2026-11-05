import {
  makeFieldsStep,
  makeOutMessageFold,
  makeBinding,
  makeComposition,
} from './block'

const foldSearchOutMessage = makeOutMessageFold(Search.SearchBlock, {
  RestoredQuery: ({ query }) =>
    makeFieldsStep(() => ({
      maybeRestoredQuery: () => Option.some(query),
    })),
})

const foldEditorOutMessage = makeOutMessageFold(Editor.EditorBlock, {
  RestoredDraft: ({ documentId }) =>
    makeFieldsStep(() => ({
      maybeRestoredDocumentId: () => Option.some(documentId),
    })),
})

const SearchBinding = makeBinding(Search.SearchBlock, {
  field: 'search',
}).withOutMessagePolicy({ fold: foldSearchOutMessage })

const EditorBinding = makeBinding(Editor.EditorBlock, {
  field: 'editor',
}).withOutMessagePolicy({ fold: foldEditorOutMessage })

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
