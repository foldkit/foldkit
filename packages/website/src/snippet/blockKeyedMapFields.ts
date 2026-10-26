import { HashMap, Schema } from 'effect'
import { Block } from 'foldkit'
import { makeMapBinding } from 'foldkit/mapBinding'

import { EntryBlock } from './blockKeyedMapChild'

const EntryRow = Schema.Struct({
  createdBy: Schema.String,
  entry: EntryBlock.Model,
})
const Model = Schema.Struct({
  entriesById: Schema.Record(Schema.String, EntryBlock.Model),
  rowsById: Schema.HashMap(Schema.String, EntryRow),
})
const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message: Schema.Never,
})

export const EntriesBinding = makeMapBinding(
  ApplicationDefinition,
  EntryBlock,
  {
    field: 'entriesById',
  },
)
export const RowsBinding = makeMapBinding(ApplicationDefinition, EntryBlock, {
  field: 'rowsById',
  childField: 'entry',
})
export const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [EntriesBinding, RowsBinding],
})
export const init = ApplicationComposition.makeInit(() => ({
  model: { entriesById: {}, rowsById: HashMap.empty() },
}))
