import { Schema } from 'effect'
import * as Block from 'foldkit/block'
import { defineMessageUnion } from 'foldkit/message'

const Model = Schema.Struct({ count: Schema.Number })
export const Message = defineMessageUnion({
  UpdatedCount: { value: Schema.Number },
  RequestedSetCount: { value: Schema.Number },
})
export const OutMessage = defineMessageUnion({
  ChangedCount: { count: Schema.Number },
})
const Inputs =
  Block.makeInputContract<Readonly<{ toLabel: (count: number) => string }>>()
export const ChildKey = Symbol('CanonicalNamespaceChild')
export const ChildDefinition = Block.makeDefinition('CanonicalNamespaceChild', {
  key: ChildKey,
  Model,
  Message,
  OutMessage,
  Init: Schema.Tuple([Schema.Number]),
  view: { kind: 'Element', Inputs },
  operations: {
    setCount: {
      message: Message.RequestedSetCount,
      outMessage: OutMessage.ChangedCount,
    },
  },
})
export const ChildContract = ChildDefinition.contract
