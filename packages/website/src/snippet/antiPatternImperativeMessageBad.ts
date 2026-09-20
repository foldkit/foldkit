// ❌ Bad: FetchWeather tells update what to do, not what happened.

import type { Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  FetchWeather: {},
})
type Message = typeof Message.Type

const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    FetchWeather: () => ({ model, commands: [FetchWeather()] }),
  })
