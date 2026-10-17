import {
  WorkspaceComposition,
  SearchBinding,
  EditorBinding,
} from './composition'
const init = WorkspaceComposition.makeInit(() => ({
  model: {
    maybeSelectedDocumentId: Option.none(),
    maybeOpenedDocumentId: Option.none(),
  },
  steps: [SearchBinding.restore(), EditorBinding.restore()],
}))
