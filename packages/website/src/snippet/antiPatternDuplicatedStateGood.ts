// ✅ Good: the Model stores the source values and derives the result.

import { Schema } from 'effect'

const Item = Schema.Struct({ id: Schema.String, name: Schema.String })

const Model = Schema.Struct({
  items: Schema.Array(Item),
  query: Schema.String,
})
type Model = typeof Model.Type

const visibleItems = (model: Model) =>
  model.items.filter(item =>
    item.name.toLowerCase().includes(model.query.toLowerCase()),
  )
