import { Schema } from 'effect'
// ❌ Bad: visibleItems can stop matching items and query.
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const Item = Schema.Struct({ id: Schema.String, name: Schema.String })
type Item = typeof Item.Type

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

const ApplicationComposition = Block.makeDefinition('Application', {
  Model,
  Message,
}).makeComposition()

const update = ApplicationComposition.makeUpdate({
  UpdatedQuery: (model, { query }) => ({
    model: modifyFields(model, { query: () => query }),
  }),
})
