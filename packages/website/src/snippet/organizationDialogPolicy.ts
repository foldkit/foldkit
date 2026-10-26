import { Dialog } from '@foldkit/ui'

import { SaveDraft } from '../command'
import { EditorDefinition, makeCommandsStep, makeNoopStep } from '../definition'

const foldDialogOutMessage = EditorDefinition.makeOutMessageFold(
  Dialog.DialogBlock,
  {
    Opened: makeNoopStep,
    CompletedClose: makeNoopStep,
    Closed: () =>
      makeCommandsStep(model => [SaveDraft({ contents: model.contents })]),
  },
)

export const DialogBinding = EditorDefinition.makeBinding(Dialog.DialogBlock, {
  field: 'dialog',
}).withOutMessagePolicy({ fold: foldDialogOutMessage })
