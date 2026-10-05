import * as Combobox from '@foldkit/ui/combobox'

import { Message, runCounter } from './program'

runCounter((model, h) =>
  h.button(
    [h.OnClick(Message.ClickedIncrement())],
    [globalThis.String(model.count)],
  ),
)

Object.assign(globalThis, {
  __foldkitBundleProbe: {
    Model: Combobox.Model,
    Message: Combobox.Message,
    init: Combobox.init,
    component: Combobox.create<string>(),
  },
})
