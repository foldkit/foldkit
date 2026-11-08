import { Option } from 'effect'

import { ApplicationComposition } from './composition.js'
import { addEditor } from './steps.js'

export const init = ApplicationComposition.makeInit(() => ({
  model: {
    maybeEditor: Option.none(),
    editors: {},
    rows: [],
    lastChangedText: '',
    lastSavedText: '',
    updateCount: 0,
    nextEditorId: 0,
  },
  steps: [addEditor],
}))
