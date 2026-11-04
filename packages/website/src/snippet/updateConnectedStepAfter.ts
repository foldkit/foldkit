// ✅ Preserve connected Steps until the Composition runs them.
import { Update } from 'foldkit'

import {
  ApplicationBlock,
  DialogBinding,
  SelectionBinding,
} from './composition'

export const finishEditing = ApplicationBlock.makeStep(() =>
  Update.combineSteps([
    DialogBinding.requestClose(),
    SelectionBinding.requestClear(),
  ]),
)
