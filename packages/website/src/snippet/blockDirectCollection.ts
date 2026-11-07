import { Schema } from 'effect'
import { Block } from 'foldkit'

import { Message } from './message'
import { Model } from './model'
import { Row } from './row'

export const TableKey = Symbol('Table')
const TableBlock = Block.make('Table', {
  key: TableKey,
  InitArgs: Schema.Tuple([]),
  Model,
  Message,
})

const { makeKeyedArrayBinding } = TableBlock

export const RowsBinding = makeKeyedArrayBinding(Row.RowBlock, {
  field: 'rows',
  key: 'id',
})
