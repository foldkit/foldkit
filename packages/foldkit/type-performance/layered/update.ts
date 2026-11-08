import { Update } from 'foldkit'

import { makeStep } from './block.js'
import { ApplicationComposition, FocusedBinding } from './composition.js'
import {
  addEditor,
  changePairedText,
  clearPairedEditors,
  recordUpdate,
} from './steps.js'

export const update = ApplicationComposition.makeUpdate({
  ClickedClearPairedEditors: clearPairedEditors,
  ClickedSaveFocused: FocusedBinding.requestSave(),
  ClickedAddEditor: addEditor,
  UpdatedPairedText: makeStep.fromMessage(({ text }) => changePairedText(text)),
})

export const countedUpdate = ApplicationComposition.makeUpdate.compose(
  update,
  ApplicationComposition.makeUpdate.each(recordUpdate),
)

export const repeatedRecordUpdate = Update.combineSteps([
  recordUpdate,
  recordUpdate,
])
