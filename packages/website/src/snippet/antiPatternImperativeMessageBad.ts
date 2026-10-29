// ❌ Bad: FetchWeather tells update what to do, not what happened.

import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  FetchWeather: {},
})
type Message = typeof Message.Type

const update = ApplicationComposition.makeUpdate({
  FetchWeather: model => ({ model, commands: [FetchWeather()] }),
})
