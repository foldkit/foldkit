// ✅ Good: the Message records the click. The Command names the work.

import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  ClickedRefresh: {},
})
type Message = typeof Message.Type

const update = ApplicationComposition.makeUpdate((model, message) =>
  Message.match(message, {
    ClickedRefresh: () => ({ model, commands: [FetchWeather()] }),
  }),
)
