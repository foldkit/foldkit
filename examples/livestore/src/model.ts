import { Schema } from 'effect'

import { Items } from './schema'

export const Filter = Schema.Literals(['All', 'Active', 'Completed'])
export type Filter = typeof Filter.Type

export const Model = Schema.Struct({
  items: Items,
  maybeAddItemError: Schema.Option(Schema.String),
  newItemText: Schema.String,
  filter: Filter,
})
export type Model = typeof Model.Type
