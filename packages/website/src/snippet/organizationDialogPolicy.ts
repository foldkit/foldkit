import { DialogBlock } from '@foldkit/ui/dialog'

import { SaveDraft } from '../command'
import { EditorBlock, makeCommandsStep, makeNoopStep } from '../definition'

const foldDialogOutMessage = EditorBlock.makeOutMessageFold(DialogBlock, {
  Opened: makeNoopStep,
  CompletedClose: makeNoopStep,
  Closed: () =>
    makeCommandsStep(model => [SaveDraft({ contents: model.contents })]),
})

export const DialogBinding = EditorBlock.makeBinding(DialogBlock, {
  field: 'dialog',
}).withOutMessagePolicy({ fold: foldDialogOutMessage })
