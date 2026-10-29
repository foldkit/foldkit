import { HashMap, Schema } from 'effect'
import { Block } from 'foldkit'

import { EntryBlock } from './blockKeyedMapChild'

const EntryRow = Schema.Struct({
  createdBy: Schema.String,
  entry: EntryBlock.Model,
})
type EntryRow = typeof EntryRow.Type

const Model = Schema.Struct({
  entriesById: Schema.Record(Schema.String, EntryBlock.Model),
  rowsById: Schema.HashMap(Schema.String, EntryRow),
})
type Model = typeof Model.Type

const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message: Schema.Never,
})

export const EntriesBinding = ApplicationDefinition.makeMapBinding(EntryBlock, {
  field: 'entriesById',
})
export const RowsBinding = ApplicationDefinition.makeMapBinding(EntryBlock, {
  field: 'rowsById',
  childField: 'entry',
})
export const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [EntriesBinding, RowsBinding],
})
export const init = ApplicationComposition.makeInit(() => ({
  model: { entriesById: {}, rowsById: HashMap.empty() },
}))
