import * as Dialog from '@foldkit/ui/dialog'

import { Message, runCounter } from './program'

runCounter((model, h) =>
  h.button(
    [h.OnClick(Message.ClickedIncrement())],
    [globalThis.String(model.count)],
  ),
)

Object.assign(globalThis, {
  __foldkitBundleProbe: {
    Model: Dialog.Model,
    Message: Dialog.Message,
    init: Dialog.init,
    update: Dialog.update,
    view: Dialog.view,
  },
})
