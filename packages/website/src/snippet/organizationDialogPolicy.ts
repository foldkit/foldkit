import { Dialog } from '@foldkit/ui'

import {
  EditorBlock,
  makeCommandsStep,
  makeNoopStep,
  makeOutMessageFold,
  makeRequiredFieldBinding,
} from '../block'
import { SaveDraft } from '../command'

export const DialogBinding = makeRequiredFieldBinding(Dialog.DialogBlock, {
  field: 'dialog',
}).withOutMessagePolicy({
  fold: makeOutMessageFold(Dialog.DialogBlock, {
    Opened: makeNoopStep,
    CompletedClose: makeNoopStep,
    Closed: () =>
      makeCommandsStep(model => [SaveDraft({ contents: model.contents })]),
  }),
})
