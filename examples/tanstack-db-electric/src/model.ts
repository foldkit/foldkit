import { Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

import { Items } from './domain'

export const WriteError = defineTaggedUnion({
  AddItem: { error: Schema.String },
  PersistItems: { error: Schema.String },
})
export type WriteError = typeof WriteError.Type

export const Model = Schema.Struct({
  items: Items.Items,
  maybeWriteError: Schema.Option(WriteError),
  newItemText: Schema.String,
  filter: Items.Filter,
})
export type Model = typeof Model.Type
