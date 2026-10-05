import { Message, runCounter } from './program'

runCounter((model, h) =>
  h.button(
    [h.OnClick(Message.ClickedIncrement())],
    [globalThis.String(model.count)],
  ),
)
