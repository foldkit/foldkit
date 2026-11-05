import { Schema } from 'effect'
import { Block } from 'foldkit'

import { Message } from './message'
import { Model } from './model'
import { Row } from './row'

export const TableKey = Symbol('Table')
const TableBlock = Block.make('Table', {
  key: TableKey,
  Init: Schema.Tuple([]),
  Model,
  Message,
})

const { makeBinding } = TableBlock

export const RowsBinding = makeBinding(Row.RowBlock, {
  field: 'rows',
  key: 'id',
})
