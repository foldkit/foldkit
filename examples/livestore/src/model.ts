import { Schema } from 'effect'

import { Items } from './domain'

export const Model = Schema.Struct({
  items: Items.Items,
  maybeAddItemError: Schema.Option(Schema.String),
  newItemText: Schema.String,
  filter: Items.Filter,
})
export type Model = typeof Model.Type
