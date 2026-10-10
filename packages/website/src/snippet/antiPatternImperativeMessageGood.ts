// ✅ Good: the Message records the click. The Command names the work.

import { Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  ClickedRefresh: {},
})
type Message = typeof Message.Type

const update = Update.make((model: Model, message: Message) =>
  Message.match(message, {
    ClickedRefresh: () => ({ model, commands: [FetchWeather()] }),
  }),
)
