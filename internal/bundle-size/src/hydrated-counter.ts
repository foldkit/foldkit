import { hydrateCounter, Message } from './program'

hydrateCounter((model, h) =>
  h.button(
    [h.OnClick(Message.ClickedIncrement())],
    [globalThis.String(model.count)],
  ),
)
