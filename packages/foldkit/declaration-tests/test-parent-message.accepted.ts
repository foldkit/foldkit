import { Option, Schema } from 'effect'
import * as Block from 'foldkit/block'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'
import { toParentMessage } from 'foldkit/test'

export const CounterModel = Schema.Struct({
  id: Schema.String,
  count: Schema.Number,
})
export const CounterMessage = defineMessageUnion({
  ClickedIncrement: {},
  RequestedAdd: {
    amount: Schema.NumberFromString.check(Schema.isGreaterThan(0)),
  },
})
const CounterDefinition = Block.makeDefinition('TestMessageCounter', {
  Model: CounterModel,
  Message: CounterMessage,
})
const CounterComposition = CounterDefinition.makeComposition()
const prepareCounterBlock = () =>
  CounterComposition.prepareBlock({
    init: CounterComposition.makeInit((id: string) => ({
      model: { id, count: 0 },
    })),
    update: CounterComposition.makeUpdate.withContext((amount: number) => ({
      ClickedIncrement: model => ({
        model: modifyFields(model, { count: count => count + amount }),
      }),
      RequestedAdd: (model, message) => ({
        model: modifyFields(model, {
          count: count => count + message.amount * amount,
        }),
      }),
    })),
  })
export const CounterBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof CounterModel,
  typeof prepareCounterBlock
> = Block.assemble(prepareCounterBlock)

const MessageFreeDefinition = Block.makeDefinition('TestMessageFreeChild', {
  Model: CounterModel,
  Message: Schema.Never,
})
const MessageFreeComposition = MessageFreeDefinition.makeComposition()
const prepareMessageFreeBlock = () =>
  MessageFreeComposition.prepareBlock({
    init: MessageFreeComposition.makeInit((id: string) => ({
      model: { id, count: 0 },
    })),
    update: MessageFreeComposition.makeUpdate({}),
  })
const MessageFreeBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof CounterModel,
  typeof prepareMessageFreeBlock
> = Block.assemble(prepareMessageFreeBlock)

const WrappedEntry = Schema.Struct({
  roomId: Schema.String,
  counter: CounterModel,
})
const NumericEntry = Schema.Struct({
  order: Schema.Number,
  counter: CounterModel,
})
const LiteralEntry = Schema.Struct({
  slot: Schema.Literals(['Primary', 'Secondary']),
  counter: CounterModel,
})
const CounterParentModel = Schema.Struct({
  selected: Schema.Option(CounterModel),
  counters: Schema.Array(CounterModel),
  wrappedEntries: Schema.Array(WrappedEntry),
  numericEntries: Schema.Array(NumericEntry),
  literalEntries: Schema.Array(LiteralEntry),
  amount: Schema.Number,
})
const CounterParentDefinition = Block.makeDefinition('TestMessageParent', {
  Model: CounterParentModel,
  Message: Schema.Never,
})
export const AccessorBinding = CounterParentDefinition.makeBinding(
  CounterBlock,
  {
    placement: 'selected',
    read: model => model.selected,
    write: (model, nextCounter) =>
      modifyFields(model, { selected: () => Option.some(nextCounter) }),
    delivery: { toUpdateContext: model => [model.amount] },
  },
)
export const MessageFreeBinding = CounterParentDefinition.makeBinding(
  MessageFreeBlock,
  {
    placement: 'silent',
    read: model => model.selected,
    write: (model, nextCounter) =>
      modifyFields(model, { selected: () => Option.some(nextCounter) }),
  },
)
export const KeyedFieldBinding = CounterParentDefinition.makeBinding(
  CounterBlock,
  {
    field: 'counters',
    key: 'id',
    placement: 'counters',
    delivery: { toUpdateContext: model => [model.amount] },
  },
)
export const WrappedBinding = CounterParentDefinition.makeBinding(
  CounterBlock,
  {
    field: 'wrappedEntries',
    key: 'roomId',
    childField: 'counter',
    placement: 'wrapped',
    delivery: { toUpdateContext: model => [model.amount] },
  },
)
export const NumericBinding = CounterParentDefinition.makeBinding(
  CounterBlock,
  {
    placement: 'numeric',
    readAll: model => model.numericEntries,
    key: entry => entry.order,
    keySchema: Schema.NumberFromString.check(Schema.isGreaterThan(0)),
    read: entry => entry.counter,
    writeAt: (model, order, nextCounter) =>
      modifyFields(model, {
        numericEntries: entries =>
          entries.map(entry =>
            entry.order === order
              ? modifyFields(entry, { counter: () => nextCounter })
              : entry,
          ),
      }),
    delivery: { toUpdateContext: model => [model.amount] },
  },
)
export const LiteralBinding = CounterParentDefinition.makeBinding(
  CounterBlock,
  {
    placement: 'literal',
    readAll: model => model.literalEntries,
    key: entry => entry.slot,
    keySchema: LiteralEntry.fields.slot,
    read: entry => entry.counter,
    writeAt: (model, slot, nextCounter) =>
      modifyFields(model, {
        literalEntries: entries =>
          entries.map(entry =>
            entry.slot === slot
              ? modifyFields(entry, { counter: () => nextCounter })
              : entry,
          ),
      }),
    delivery: { toUpdateContext: model => [model.amount] },
  },
)

export const accessorParentMessage = toParentMessage(
  AccessorBinding,
  CounterMessage.ClickedIncrement(),
)
export const refinedPayloadParentMessage = toParentMessage(
  AccessorBinding,
  CounterMessage.RequestedAdd({ amount: 2 }),
)
export const keyedParentMessage = toParentMessage(
  KeyedFieldBinding,
  'first',
  CounterMessage.ClickedIncrement(),
)
export const codecParentMessage = toParentMessage(
  NumericBinding,
  1,
  CounterMessage.ClickedIncrement(),
)
export const wrappedParentMessage = toParentMessage(
  WrappedBinding,
  'wrapped-room',
  CounterMessage.ClickedIncrement(),
)
export const numericParentMessage = toParentMessage(
  NumericBinding,
  1,
  CounterMessage.ClickedIncrement(),
)
export const literalParentMessage = toParentMessage(
  LiteralBinding,
  'Primary',
  CounterMessage.ClickedIncrement(),
)

export const PolicyChildModel = Schema.Struct({ count: Schema.Number })
export const PolicyChildMessage = defineMessageUnion({
  RequestedIncrement: {},
})
export const PolicyChildOutMessage = defineMessageUnion({
  Incremented: { count: Schema.Number },
})
const PolicyChildDefinition = Block.makeDefinition('TestPolicyChild', {
  Model: PolicyChildModel,
  Message: PolicyChildMessage,
  OutMessage: PolicyChildOutMessage,
})
const PolicyChildComposition = PolicyChildDefinition.makeComposition()
const preparePolicyChildBlock = () =>
  PolicyChildComposition.prepareBlock({
    init: PolicyChildComposition.makeInit(() => ({ model: { count: 0 } })),
    update: PolicyChildComposition.makeUpdate({
      RequestedIncrement: model => ({
        model: modifyFields(model, { count: count => count + 1 }),
        outMessage: PolicyChildOutMessage.Incremented({
          count: model.count + 1,
        }),
      }),
    }),
    view: PolicyChildComposition.makeView.withInputs<
      Readonly<{
        label: string
        renderCount: (count: number) => string
        onRendered: (label: string, count: number) => void
      }>
    >((_model, _viewInputs, h) => h.empty),
  })
export const PolicyChildBlock: Block.FromAssemblyWithViewAndOutMessage<
  typeof PolicyChildModel,
  typeof preparePolicyChildBlock
> = Block.assemble(preparePolicyChildBlock)

export const PolicyParentModel = Schema.Struct({
  child: PolicyChildModel,
  observedCount: Schema.Number,
})
const PolicyParentDefinition = Block.makeDefinition('TestPolicyParent', {
  Model: PolicyParentModel,
  Message: Schema.Never,
})
export const PolicyBindingWithoutPolicy = PolicyParentDefinition.makeBinding(
  PolicyChildBlock,
  { field: 'child' },
)
export const PolicyBinding = PolicyBindingWithoutPolicy.withOutMessagePolicy({
  fold: PolicyParentDefinition.makeOutMessageFold(PolicyChildBlock, {
    Incremented: ({ count }) =>
      PolicyParentDefinition.makeFieldsStep(() => ({
        observedCount: () => count,
      })),
  }),
})
export const policyParentMessage = toParentMessage(
  PolicyBinding,
  PolicyChildMessage.RequestedIncrement(),
)

const ChoiceNamespace = Block.makeNamespace('TestMessageChoice')

const makeChoiceParts = <const Values extends ReadonlyArray<string>>(
  Value: Schema.Literals<Values>,
) => {
  const Model = Schema.Struct({ value: Value })
  const Message = Schema.TaggedStruct('SelectedValue', { value: Value })
  const Definition = ChoiceNamespace.makeDefinition({ Model, Message })
  const Composition = Definition.makeComposition()
  const implementation = {
    init: Composition.makeInit((value: Values[number]) => ({
      model: Model.make({ value }),
    })),
    update: Composition.makeUpdate({
      SelectedValue: (_model, message) => ({
        model: Model.make({ value: message.value }),
      }),
    }),
  }
  return { Composition, implementation }
}

type ChoiceParts<Values extends ReadonlyArray<string>> = ReturnType<
  typeof makeChoiceParts<Values>
>

type CompletedChoice<Values extends ReadonlyArray<string>> = Block.Completed<
  ChoiceParts<Values>['Composition'],
  ChoiceParts<Values>['implementation']
>

const makeChoice = <const Values extends ReadonlyArray<string>>(
  Value: Schema.Literals<Values>,
): CompletedChoice<Values> => {
  const { Composition, implementation } = makeChoiceParts(Value)
  const prepareBlock = () => Composition.prepareBlock(implementation)
  const ChoiceBlock: Block.FromAssemblyWithoutViewOrOutMessage<
    typeof Composition.Model,
    typeof prepareBlock
  > = Block.assemble(prepareBlock)
  return ChoiceBlock
}

export const PrimaryChoice = makeChoice(Schema.Literals(['One', 'Two']))
export const SecondaryChoice = makeChoice(Schema.Literals(['Three', 'Four']))
const GenericParentModel = Schema.Struct({
  primaryChoice: PrimaryChoice.Model,
  secondaryChoice: SecondaryChoice.Model,
})
const GenericParentDefinition = Block.makeDefinition('GenericValueParent', {
  Model: GenericParentModel,
  Message: Schema.Never,
})
export const PrimaryChoiceBinding = GenericParentDefinition.makeBinding(
  PrimaryChoice,
  {
    placement: 'primaryChoice',
    read: model => Option.some(model.primaryChoice),
    write: (model, nextValue) =>
      modifyFields(model, { primaryChoice: () => nextValue }),
  },
)
export const SecondaryChoiceBinding = GenericParentDefinition.makeBinding(
  SecondaryChoice,
  {
    placement: 'secondaryChoice',
    read: model => Option.some(model.secondaryChoice),
    write: (model, nextValue) =>
      modifyFields(model, { secondaryChoice: () => nextValue }),
  },
)
export const primaryChoiceParentMessage = toParentMessage(
  PrimaryChoiceBinding,
  PrimaryChoice.Message.make({ value: 'One' }),
)
export const secondaryChoiceParentMessage = toParentMessage(
  SecondaryChoiceBinding,
  SecondaryChoice.Message.make({ value: 'Three' }),
)

const NestedChildModel = Schema.Struct({ value: Schema.String })
export const NestedChildMessage = defineMessageUnion({ ChangedValue: {} })
const NestedChildDefinition = Block.makeDefinition('NestedChild', {
  Model: NestedChildModel,
  Message: NestedChildMessage,
})
const NestedChildComposition = NestedChildDefinition.makeComposition()
const prepareNestedChildBlock = () =>
  NestedChildComposition.prepareBlock({
    init: NestedChildComposition.makeInit(() => ({ model: { value: '' } })),
    update: NestedChildComposition.makeUpdate({
      ChangedValue: model => ({ model }),
    }),
  })
export const NestedChildBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof NestedChildModel,
  typeof prepareNestedChildBlock
> = Block.assemble(prepareNestedChildBlock)

const NestedParentModel = Schema.Struct({ child: NestedChildModel })
const NestedParentDefinition = Block.makeDefinition('NestedParent', {
  Model: NestedParentModel,
  Message: Schema.Never,
})
export const NestedChildBinding = NestedParentDefinition.makeBinding(
  NestedChildBlock,
  { field: 'child' },
)
const NestedParentComposition = NestedParentDefinition.makeComposition({
  bindings: [NestedChildBinding],
})
const prepareNestedParentBlock = () =>
  NestedParentComposition.prepareBlock({
    init: NestedParentComposition.makeInit(() => ({ model: {} })),
    update: NestedParentComposition.makeUpdate({}),
  })
export const NestedParentBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof NestedParentModel,
  typeof prepareNestedParentBlock
> = Block.assemble(prepareNestedParentBlock)

const RootModel = Schema.Struct({
  maybeParent: Schema.Option(NestedParentModel),
})
const RootDefinition = Block.makeDefinition('NestedRoot', {
  Model: RootModel,
  Message: Schema.Never,
})
export const NestedParentBinding = RootDefinition.makeBinding(
  NestedParentBlock,
  { field: 'maybeParent' },
)
export const nestedChildParentMessage = toParentMessage(
  NestedChildBinding,
  NestedChildMessage.ChangedValue(),
)
export const nestedRootMessage = toParentMessage(
  NestedParentBinding,
  nestedChildParentMessage,
)

export type AccessorParentMessage = typeof accessorParentMessage
export type RefinedPayloadParentMessage = typeof refinedPayloadParentMessage
export type KeyedParentMessage = typeof keyedParentMessage
export type PolicyParentMessage = typeof policyParentMessage
export type NestedRootMessage = typeof nestedRootMessage
