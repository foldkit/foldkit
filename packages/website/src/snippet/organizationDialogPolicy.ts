import { Dialog } from '@foldkit/ui'

import { SaveDraft } from '../command'
import { Editor } from '../definition'
import { Message } from '../message'

const foldDialogOutMessage = Dialog.OutMessage.match({
  Opened: () => Editor.step(model => ({ model })),
  Closed: () =>
    Editor.step(model => ({
      model,
      commands: [SaveDraft({ contents: model.contents })],
    })),
})

export const DialogBinding = Editor.bindChild(Dialog.block, {
  field: 'dialog',
  parentMessage: Message.GotDialogMessage,
  outMessage: { fold: foldDialogOutMessage },
})
