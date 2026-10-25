import { Dialog } from '@foldkit/ui'

import { SaveDraft } from '../command'
import { EditorDefinition } from '../definition'

const foldDialogOutMessage = EditorDefinition.makeOutMessageFold(
  Dialog.DialogBlock,
  {
    Opened: EditorDefinition.makeNoopStep,
    CompletedClose: EditorDefinition.makeNoopStep,
    Closed: () =>
      EditorDefinition.makeCommandsStep(model => [
        SaveDraft({ contents: model.contents }),
      ]),
  },
)

export const DialogBinding = EditorDefinition.makeBinding(Dialog.DialogBlock, {
  field: 'dialog',
}).withOutMessagePolicy({ fold: foldDialogOutMessage })
