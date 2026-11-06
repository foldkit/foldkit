import { Update } from 'foldkit'

import { makeFieldsStep, makeStep } from './block'
import { DialogBinding } from './composition'

export const closePalette = makeStep(() => DialogBinding.requestClose())

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
