import { Dialog } from '@foldkit/ui'

import {
  EditorBlock,
  makeCommandsStep,
  makeNoopStep,
  makeOutMessageFold,
  makeBinding,
} from '../block'
import { SaveDraft } from '../command'

const foldDialogOutMessage = makeOutMessageFold(Dialog.DialogBlock, {
  Opened: makeNoopStep,
  CompletedClose: makeNoopStep,
  Closed: () =>
    makeCommandsStep(model => [SaveDraft({ contents: model.contents })]),
})

export const DialogBinding = makeBinding(Dialog.DialogBlock, {
  field: 'dialog',
}).withOutMessagePolicy({ fold: foldDialogOutMessage })
