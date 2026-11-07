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
  InitArgs: Schema.Tuple([]),
  Model,
  Message: Schema.Never,
})

const { makeRecordBinding, makeHashMapBinding, makeComposition } =
  ApplicationBlock

export const EntriesByIdBinding = makeRecordBinding(EntryBlock, {
  field: 'entriesById',
})
export const RowsByIdBinding = makeHashMapBinding(EntryBlock, {
  field: 'rowsById',
  childField: 'entry',
})
export const ApplicationComposition = makeComposition({
  bindings: [EntriesByIdBinding, RowsByIdBinding],
})
export const init = ApplicationComposition.makeInit(() => ({
  model: { entriesById: {}, rowsById: HashMap.empty() },
}))
