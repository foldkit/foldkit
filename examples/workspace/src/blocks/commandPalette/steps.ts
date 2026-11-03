import { Update } from 'foldkit'

import { DialogBinding } from './composition'
import { makeFieldsStep, makeStep } from './definition'

export const closeDialog = DialogBinding.requestClose()

export const openPalette = makeStep(model => {
  if (model.dialog.isOpen) {
    return { model }
  }

  return Update.combineSteps([
    makeFieldsStep(() => ({
      query: () => '',
      activeResultIndex: () => 0,
    })),
    DialogBinding.requestOpen(),
  ])
})
