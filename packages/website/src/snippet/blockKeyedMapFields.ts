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

const ApplicationKey = Symbol('Application')

const ApplicationDefinition = Block.makeDefinition('Application', {
  key: ApplicationKey,
  Init: Schema.Tuple([]),
  Model,
  Message: Schema.Never,
})

export const EntriesByIdBinding = ApplicationDefinition.makeMapBinding(
  EntryBlock,
  {
    field: 'entriesById',
  },
)
export const RowsByIdBinding = ApplicationDefinition.makeMapBinding(
  EntryBlock,
  {
    field: 'rowsById',
    childField: 'entry',
  },
)
export const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [EntriesByIdBinding, RowsByIdBinding],
})
export const init = ApplicationComposition.makeInit(() => ({
  model: { entriesById: {}, rowsById: HashMap.empty() },
}))
