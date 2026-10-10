// ❌ Bad: FetchWeather tells update what to do, not what happened.

import { Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  FetchWeather: {},
})
type Message = typeof Message.Type

const update = Update.make((model: Model, message: Message) =>
  Message.match(message, {
    FetchWeather: () => ({ model, commands: [FetchWeather()] }),
  }),
)
