// ✅ Preserve connected Steps until the Composition runs them.
import { Update } from 'foldkit'

import {
  ApplicationDefinition,
  DialogBinding,
  SelectionBinding,
} from './composition'

export const finishEditingStep = ApplicationDefinition.makeStep(() =>
  Update.combineSteps([
    DialogBinding.requestClose(),
    SelectionBinding.requestClear(),
  ]),
)
