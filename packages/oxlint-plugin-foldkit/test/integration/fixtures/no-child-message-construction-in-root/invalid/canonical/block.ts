import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

export { AliasedChildBlock } from './blocks'

const Model = Schema.Struct({ count: Schema.Number })
export const Message = defineMessageUnion({ CompletedRead: {} })
const ParentKey = Symbol('Parent')
export const ParentBlock = Block.make('Parent', {
  key: ParentKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
})
