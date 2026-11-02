// ✅ Good: the Model stores the source values and derives the result.

import { Schema } from 'effect'

export const Item = Schema.Struct({ id: Schema.String, name: Schema.String })
export type Item = typeof Item.Type

export const Model = Schema.Struct({
  items: Schema.Array(Item),
  query: Schema.String,
})
export type Model = typeof Model.Type

export const visibleItems = (model: Model) =>
  model.items.filter(item =>
    item.name.toLowerCase().includes(model.query.toLowerCase()),
  )
