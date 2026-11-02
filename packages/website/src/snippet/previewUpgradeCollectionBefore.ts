// Before: a keyed Binding over an array of child Models.
import { TableDefinition } from './definition'
import { RowBlock } from './row'

export const RowsBinding = TableDefinition.makeBinding(RowBlock, {
  field: 'rows',
  key: 'id',
})
