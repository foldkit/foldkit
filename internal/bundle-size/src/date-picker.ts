import * as DatePicker from '@foldkit/ui/datePicker'

import { Message, runCounter } from './program'

runCounter((model, h) =>
  h.button(
    [h.OnClick(Message.ClickedIncrement())],
    [globalThis.String(model.count)],
  ),
)

Object.assign(globalThis, {
  __foldkitBundleProbe: {
    Model: DatePicker.Model,
    Message: DatePicker.Message,
    init: DatePicker.init,
    update: DatePicker.update,
    view: DatePicker.view,
  },
})
