import { Schema } from 'effect'
import { Block, Message as MessageModule } from 'foldkit'

export const Model = Schema.Struct({
  count: Schema.Number,
  status: Schema.Literals(['Idle', 'Ready']),
})
export const Message = MessageModule.defineMessageUnion({
  RequestedSelect: { value: Schema.String },
  RequestedClose: {},
  CompletedObserveSelection: {},
})
export const OutMessage = MessageModule.defineMessageUnion({
  SelectedChoice: { value: Schema.String },
  ClosedPicker: {},
})
export const RefinedOutMessage = MessageModule.defineMessageUnion({
  SelectedChoice: { value: Schema.Literal('Apple') },
  ClosedPicker: {},
})
export const OutMessageStepsDefinition = Block.makeDefinition(
  'OutMessageSteps',
  { Model, Message, OutMessage },
)
export const DefinitionWithoutOutMessage = Block.makeDefinition(
  'StepsWithoutOutMessage',
  { Model, Message },
)
export const emitSelected = OutMessageStepsDefinition.makeOutMessageStep(() =>
  OutMessage.SelectedChoice({ value: 'Pear' }),
)
export const emitRefined = OutMessageStepsDefinition.makeOutMessageStep(() =>
  RefinedOutMessage.SelectedChoice({ value: 'Apple' }),
)
export const emitClosed = OutMessageStepsDefinition.makeOutMessageStep(() =>
  OutMessage.ClosedPicker(),
)
export const emitUnion = (outMessage: typeof OutMessage.Type) =>
  OutMessageStepsDefinition.makeOutMessageStep(() => outMessage)
export const applyToGenericModel = <Current extends typeof Model.Type>(
  model: Current,
) => emitRefined(model)

export const PrimitiveDefinition = Block.makeDefinition('PrimitiveSteps', {
  Model: Schema.String,
  Message: Schema.Never,
  OutMessage: Schema.Literals(['Accepted', 'Cancelled']),
})
export const emitPrimitive = PrimitiveDefinition.makeOutMessageStep(
  () => 'Accepted',
)

export const OutMessageStepsComposition =
  OutMessageStepsDefinition.makeComposition()
const prepare = () =>
  OutMessageStepsComposition.prepareBlock({
    init: OutMessageStepsComposition.makeInit(() => ({
      model: Model.make({ count: 0, status: 'Idle' }),
    })),
    update: OutMessageStepsComposition.makeUpdate({
      RequestedSelect: (model, { value }) =>
        OutMessageStepsDefinition.makeOutMessageStep(() =>
          OutMessage.SelectedChoice({ value }),
        )(model),
      RequestedClose: model => emitClosed(model),
      CompletedObserveSelection: model => ({ model }),
    }),
    operations: {
      select: Message.RequestedSelect,
      close: Message.RequestedClose,
    },
  })
export const OutMessageStepsBlock: Block.FromAssemblyWithOutMessage<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)

export const ParentModel = Schema.Struct({ child: Model })
export const ParentOutMessage = MessageModule.defineMessageUnion({
  ObservedSelection: { value: Schema.String },
  ObservedClosure: {},
})
export const ParentDefinition = Block.makeDefinition('OutMessageStepsParent', {
  Model: ParentModel,
  Message: Schema.Never,
  OutMessage: ParentOutMessage,
})
export const ChildBinding = ParentDefinition.makeBinding(OutMessageStepsBlock, {
  field: 'child',
  init: false,
})
export const foldChildOutMessage = ParentDefinition.makeOutMessageFold(
  OutMessageStepsBlock,
  {
    SelectedChoice: ({ value }) =>
      ParentDefinition.makeOutMessageStep(() =>
        ParentOutMessage.ObservedSelection({ value }),
      ),
    ClosedPicker: () =>
      ParentDefinition.makeOutMessageStep(() =>
        ParentOutMessage.ObservedClosure(),
      ),
  },
)
export const ChildBindingWithOutMessagePolicy =
  ChildBinding.withOutMessagePolicy({ fold: foldChildOutMessage })
export const ParentComposition = ParentDefinition.makeComposition({
  bindings: [ChildBindingWithOutMessagePolicy],
})
export const makeParentBlock = () => {
  const prepare = () =>
    ParentComposition.prepareBlock({
      init: ParentComposition.makeInit(() => ({
        model: ParentModel.make({ child: { count: 0, status: 'Idle' } }),
      })),
      update: ParentComposition.makeUpdate({}),
    })
  const ParentBlock: Block.FromAssemblyWithOutMessage<
    typeof ParentModel,
    typeof prepare
  > = Block.assemble(prepare)

  return ParentBlock
}
export const ParentBlock = makeParentBlock()
