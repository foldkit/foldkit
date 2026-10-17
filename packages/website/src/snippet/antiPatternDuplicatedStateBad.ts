import { Schema } from 'effect'
// ❌ Bad: visibleItems can stop matching items and query.
import { defineApplication } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

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

const Application = defineApplication({ Model, Message })
const ApplicationComposition = Application.makeComposition()

const update = ApplicationComposition.makeUpdate((model, message) =>
  Message.match(message, {
    UpdatedQuery: ({ query }) => ({
      model: modifyFields(model, { query: () => query }),
    }),
  }),
)
