import * as Popover from '@foldkit/ui/popover'

import { Message, runCounter } from './program'

runCounter((model, h) =>
  h.button(
    [h.OnClick(Message.ClickedIncrement())],
    [globalThis.String(model.count)],
  ),
)

Object.assign(globalThis, {
  __foldkitBundleProbe: {
    Model: Popover.Model,
    Message: Popover.Message,
    init: Popover.init,
    update: Popover.update,
    view: Popover.view,
  },
})
