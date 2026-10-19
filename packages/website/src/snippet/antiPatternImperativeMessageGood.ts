// ✅ Good: the Message records the click. The Command names the work.

import type { Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  ClickedRefresh: {},
})
type Message = typeof Message.Type

const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedRefresh: () => ({ model, commands: [FetchWeather()] }),
  })
