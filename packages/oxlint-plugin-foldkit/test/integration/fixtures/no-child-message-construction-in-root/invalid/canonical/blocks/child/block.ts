import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Model = Schema.Struct({ count: Schema.Number })
const Message = defineMessageUnion({ ClickedCanonicalSave: {} })
const ChildKey = Symbol('Child')
export const ChildBlock = Block.make('Child', {
  key: ChildKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
})
