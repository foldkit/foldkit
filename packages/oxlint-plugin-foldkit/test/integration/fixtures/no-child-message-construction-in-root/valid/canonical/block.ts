import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Model = Schema.Struct({ count: Schema.Number })
export const Message = defineMessageUnion({ CompletedRead: {} })
const OwnerKey = Symbol('Owner')
export const OwnerBlock = Block.make('Owner', {
  key: OwnerKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
})
export const { makeCommand } = OwnerBlock
