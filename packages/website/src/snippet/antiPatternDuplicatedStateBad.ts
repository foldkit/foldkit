import { Schema } from 'effect'
// ❌ Bad: visibleItems can stop matching items and query.
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const Item = Schema.Struct({ id: Schema.String, name: Schema.String })

const Model = Schema.Struct({
  items: Schema.Array(Item),
  query: Schema.String,
  visibleItems: Schema.Array(Item),
})

const Message = defineMessageUnion({
  UpdatedQuery: { query: Schema.String },
})
const ApplicationComposition = Block.makeDefinition('Application', {
  Model,
  Message,
}).makeComposition()

const update = ApplicationComposition.makeUpdate({
  UpdatedQuery: (model, { query }) => ({
    model: modifyFields(model, { query: () => query }),
  }),
})
