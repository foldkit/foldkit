// ❌ Bad: visibleItems can stop matching items and query.

import { Schema } from 'effect'
import type { Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { evo } from 'foldkit/struct'

const Item = Schema.Struct({ id: Schema.String, name: Schema.String })

const Model = Schema.Struct({
  items: Schema.Array(Item),
  query: Schema.String,
  visibleItems: Schema.Array(Item),
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  UpdatedQuery: { query: Schema.String },
})
type Message = typeof Message.Type

const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    UpdatedQuery: ({ query }) => ({
      model: evo(model, { query: () => query }),
    }),
  })
