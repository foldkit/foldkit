import { Schema } from 'effect'
import { Block } from 'foldkit'

import { Message } from './message'
import { Model } from './model'
import { Row } from './row'

const TableKey = Symbol('Table')

const TableDefinition = Block.makeDefinition('Table', {
  key: TableKey,
  Init: Schema.Tuple([]),
  Model,
  Message,
})

export const RowsBinding = TableDefinition.makeBinding(Row.RowBlock, {
  field: 'rows',
  key: 'id',
})
