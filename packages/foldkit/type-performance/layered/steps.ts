import { Array, Number } from 'effect'
import { Update } from 'foldkit'

import { makeFieldsStep, makeStep } from './block.js'
import { PrimaryBinding, RowsBinding, SecondaryBinding } from './composition.js'

export const recordUpdate = makeFieldsStep(() => ({
  updateCount: Number.increment,
}))
export const clearPairedEditors = makeStep(() =>
  Update.combineSteps([
    PrimaryBinding.requestClear(),
    recordUpdate,
    SecondaryBinding.requestClear(),
  ]),
)
export const changePairedText = (text: string) =>
  makeStep(() =>
    Update.combineSteps([
      PrimaryBinding.informOfText({ text }),
      SecondaryBinding.informOfText({ text }),
      makeFieldsStep(() => ({ lastChangedText: () => text })),
    ]),
  )
export const addEditor = makeFieldsStep(model => ({
  rows: Array.append(
    RowsBinding.create({
      key: `editor-${model.nextEditorId}`,
      args: [`editor-${model.nextEditorId}`],
    }),
  ),
  nextEditorId: Number.increment,
}))
