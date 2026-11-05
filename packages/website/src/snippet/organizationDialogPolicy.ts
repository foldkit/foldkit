import { DialogBlock } from '@foldkit/ui/dialog'

import {
  EditorBlock,
  makeCommandsStep,
  makeNoopStep,
  makeOutMessageFold,
  makeBinding,
} from '../block'
import { SaveDraft } from '../command'

const foldDialogOutMessage = makeOutMessageFold(DialogBlock, {
  Opened: makeNoopStep,
  CompletedClose: makeNoopStep,
  Closed: () =>
    makeCommandsStep(model => [SaveDraft({ contents: model.contents })]),
})

export const DialogBinding = makeBinding(DialogBlock, {
  field: 'dialog',
}).withOutMessagePolicy({ fold: foldDialogOutMessage })
