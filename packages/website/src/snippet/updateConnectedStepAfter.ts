// ✅ Preserve connected Steps until the Composition runs them.
import { Update } from 'foldkit'

import { DialogBinding, SelectionBinding, makeStep } from './composition'

export const finishEditing = makeStep(() =>
  Update.combineSteps([
    DialogBinding.requestClose(),
    SelectionBinding.requestClear(),
  ]),
)
