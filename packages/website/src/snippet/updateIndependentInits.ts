import {
  EditorBinding,
  SearchBinding,
  WorkspaceComposition,
} from './composition'
const init = WorkspaceComposition.makeInit(() => ({
  model: {
    maybeSelectedDocumentId: Option.none(),
    maybeOpenedDocumentId: Option.none(),
  },
  steps: [SearchBinding.requestRestore(), EditorBinding.requestRestore()],
}))
