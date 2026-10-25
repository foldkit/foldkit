// ✅ Good: the Message records the click. The Command names the work.

import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  ClickedRefresh: {},
})

const update = ApplicationComposition.makeUpdate({
  ClickedRefresh: model => ({ model, commands: [FetchWeather()] }),
})
