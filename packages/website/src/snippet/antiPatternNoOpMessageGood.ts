// ✅ Good: IgnoredMouseClick records the event even when the Model stays unchanged.

import type { Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  IgnoredMouseClick: {},
})
type Message = typeof Message.Type

const handleMouseClick = () => Message.IgnoredMouseClick()

const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    IgnoredMouseClick: () => ({ model }),
  })
