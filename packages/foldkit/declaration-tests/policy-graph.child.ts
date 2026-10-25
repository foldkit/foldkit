import { Schema, Tuple } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Model = Schema.Struct({ count: Schema.Number })
const Message = defineMessageUnion({
  RequestedNotify: {},
  InformedOfIncrement: {},
})
const OutMessage = defineMessageUnion({ Notify: {} })
const Definition = Block.makeDefinition('Child', { Model, Message, OutMessage })
const ChildComposition = Definition.makeComposition()
const prepare = () =>
  ChildComposition.prepareBlock({
    init: ChildComposition.makeInit(() => ({ model: { count: 0 } })),
    update: ChildComposition.makeUpdate({
      RequestedNotify: model => ({ model, outMessage: OutMessage.Notify() }),
      InformedOfIncrement: model => ({
        model: { count: model.count + 1 },
      }),
    }),
    operations: {
      requestNotify: () => Tuple.make(Message.RequestedNotify()),
      informIncrement: () => Tuple.make(Message.InformedOfIncrement()),
    },
  })
export const ChildBlock: Block.FromAssemblyWithOutMessage<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)
