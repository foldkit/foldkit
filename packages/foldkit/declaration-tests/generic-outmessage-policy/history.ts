import { Number, Schema } from 'effect'
import { Block, Message, Struct } from 'foldkit'

const Model = Schema.Struct({ recordedSelections: Schema.Number })
const HistoryMessage = Message.defineMessageUnion({
  RequestedRecordSelection: {},
})
const HistoryDefinition = Block.makeDefinition('GenericPolicyHistory', {
  Model,
  Message: HistoryMessage,
})
const HistoryComposition = HistoryDefinition.makeComposition()

/** Sibling whose operation must remain registered when invoked by a policy. */
const prepareHistoryBlock = () =>
  HistoryComposition.prepareBlock({
    init: HistoryComposition.makeInit(() => ({
      model: Model.make({ recordedSelections: 0 }),
    })),
    update: HistoryComposition.makeUpdate({
      RequestedRecordSelection: model => ({
        model: Struct.modifyFields(model, {
          recordedSelections: Number.increment,
        }),
      }),
    }),
    operations: { recordSelection: HistoryMessage.RequestedRecordSelection },
  })
export const HistoryBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof Model,
  typeof prepareHistoryBlock
> = Block.assemble(prepareHistoryBlock)
