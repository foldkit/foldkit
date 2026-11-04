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

export const ApplicationKey = Symbol('Application')

const ApplicationBlock = Block.make('Application', {
  key: ApplicationKey,
  Init: Schema.Tuple([]),
  Model,
  Message: Schema.Never,
})

export const EntriesByIdBinding = ApplicationBlock.makeMapBinding(EntryBlock, {
  field: 'entriesById',
})
export const RowsByIdBinding = ApplicationBlock.makeMapBinding(EntryBlock, {
  field: 'rowsById',
  childField: 'entry',
})
export const ApplicationComposition = ApplicationBlock.makeComposition({
  bindings: [EntriesByIdBinding, RowsByIdBinding],
})
export const init = ApplicationComposition.makeInit(() => ({
  model: { entriesById: {}, rowsById: HashMap.empty() },
}))
