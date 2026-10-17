import { Option } from 'effect'
import { Block } from 'foldkit'

import { Message } from './message'
import { Model } from './model'
import { Row } from './row'

const Table = Block.define('Table', { Model, Message })

export const RowsBinding = Table.bindChild(Row.block, {
  field: 'rows',
  key: 'id',
  toParentMessage: (rowId, message) =>
    Message.GotRowMessage({ rowId, message }),
  fromParentMessage: {
    parentMessage: Message.GotRowMessage,
    args: (_model, { rowId, message }) => Option.some([rowId, message]),
  },
})
