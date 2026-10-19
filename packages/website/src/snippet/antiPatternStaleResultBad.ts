// ❌ Bad: the result does not identify which search produced it.

import { Schema } from 'effect'
import type { Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const Message = defineMessageUnion({
  SucceededSearch: { suggestions: Schema.Array(Schema.String) },
})
type Message = typeof Message.Type

const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    SucceededSearch: ({ suggestions }) => ({
      model: modifyFields(model, { suggestions: () => suggestions }),
    }),
  })
