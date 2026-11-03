import { Effect, Schema } from 'effect'
import * as Block from 'foldkit/block'
import { defineMessageUnion } from 'foldkit/message'
import * as Story from 'foldkit/story'
import { makeVariantBinding } from 'foldkit/variantBinding'
import { expectTypeOf } from 'vitest'

export const Active = Schema.Struct({
  _tag: Schema.Literal('Active'),
  count: Schema.Number,
})
export const Inactive = Schema.Struct({
  _tag: Schema.Literal('Inactive'),
  reason: Schema.String,
})
export const ChildMessage = defineMessageUnion({
  RequestedSetCount: { count: Schema.Number },
  RequestedNotify: {},
  RequestedDismiss: {},
})
export const ChildOutMessage = defineMessageUnion({
  NotifiedCount: { count: Schema.Number },
  Dismissed: {},
})
export const ChildKey = Symbol('VariantContractChild')
export const ChildDefinition = Block.makeDefinition('VariantContractChild', {
  key: ChildKey,
  Init: Schema.Tuple([Schema.Number]),
  Model: Active,
  Message: ChildMessage,
  OutMessage: ChildOutMessage,
  operations: {
    setCount: ChildMessage.RequestedSetCount,
    notify: {
      message: ChildMessage.RequestedNotify,
      outMessage: ChildOutMessage.NotifiedCount,
    },
  },
})
const ChildComposition = ChildDefinition.makeComposition()
const ChildImplementation = ChildDefinition.makeBlock(
  Effect.succeed({
    children: [],
    init: ChildComposition.makeInit(count => ({
      model: Active.make({ _tag: 'Active', count }),
    })),
    update: ChildComposition.makeUpdate({
      RequestedSetCount: ChildDefinition.makeFieldsStep.fromMessage(
        ({ count }) => ({ count: () => count }),
      ),
      RequestedNotify: ChildDefinition.makeOutMessageStep(model =>
        ChildOutMessage.NotifiedCount({ count: model.count }),
      ),
      RequestedDismiss: ChildDefinition.makeOutMessageStep(() =>
        ChildOutMessage.Dismissed(),
      ),
    }),
  }),
)
export const ParentMessage = defineMessageUnion({
  RequestedSetCount: { count: Schema.Number },
  RequestedNotify: {},
})
export const ParentOutMessage = defineMessageUnion({
  ReportedCount: { count: Schema.Number },
})
export const ParentKey = Symbol('VariantContractParent')
export const ParentDefinition = Block.makeDefinition('VariantContractParent', {
  key: ParentKey,
  Init: Schema.Tuple([Schema.Number]),
  Model: Schema.Union([Active, Inactive]),
  Message: ParentMessage,
  OutMessage: ParentOutMessage,
})
export const forwardChild = ParentDefinition.makeOutMessageForward(
  ChildDefinition.contract,
  {
    NotifiedCount: ({ count }) => {
      expectTypeOf(count).toEqualTypeOf<number>()
      return ParentOutMessage.ReportedCount({ count })
    },
    Dismissed: () => undefined,
  },
)
export const ChildBinding = makeVariantBinding(
  ParentDefinition,
  ChildDefinition.contract,
).withOutMessagePolicy({ forward: forwardChild })
export const ParentComposition = ParentDefinition.makeComposition({
  bindings: [ChildBinding],
})
export const VariantParent = ParentDefinition.makeBlock(
  Effect.gen(function* () {
    const child = yield* ChildBinding
    return {
      children: [child],
      init: ParentComposition.makeInit(count =>
        ChildBinding.init({ args: [count], toParentModel: model => model }),
      ),
      update: ParentComposition.makeUpdate({
        RequestedSetCount: (model, { count }) =>
          ChildBinding.setCount({ count })(model),
        RequestedNotify: ChildBinding.notify(),
      }),
    }
  }),
).provide(ChildImplementation.layer)

const WrongModelKey = Symbol('VariantContractWrongModel')
const WrongModelDefinition = Block.makeDefinition('VariantContractWrongModel', {
  key: WrongModelKey,
  Init: Schema.Tuple([]),
  Model: Schema.Struct({
    _tag: Schema.Literal('Active'),
    count: Schema.String,
  }),
  Message: Schema.Never,
  isMessageFree: true,
})
const ContextKey = Symbol('VariantContractContext')
const ContextDefinition = Block.makeDefinition('VariantContractContext', {
  key: ContextKey,
  Init: Schema.Tuple([]),
  Context: Schema.Tuple([Schema.String]),
  Model: Active,
  Message: ChildMessage,
})
export const ContextBinding = makeVariantBinding(
  ParentDefinition,
  ContextDefinition.contract,
  { delivery: { toUpdateContext: model => [model._tag] } },
)
const ForeignKey = Symbol('VariantContractForeignParent')
const ForeignDefinition = Block.makeDefinition('VariantContractForeignParent', {
  key: ForeignKey,
  Init: Schema.Tuple([]),
  Model: ParentDefinition.Model,
  Message: ParentMessage,
  OutMessage: ParentOutMessage,
})

if (false) {
  // @ts-expect-error A whole variant must exactly match the parent's tagged member.
  makeVariantBinding(ParentDefinition, WrongModelDefinition.contract)
  // @ts-expect-error Only passive contracts may be declared as constructor-owned children.
  makeVariantBinding(ParentDefinition, ChildImplementation)
  // @ts-expect-error A contextual child requires a delivery context mapping.
  makeVariantBinding(ParentDefinition, ContextDefinition.contract)
  // @ts-expect-error Delivery retains the exact child Context tuple.
  makeVariantBinding(ParentDefinition, ContextDefinition.contract, {
    delivery: { toUpdateContext: () => [42] },
  })
  // @ts-expect-error Symbolic operation payloads retain the child Message contract.
  ChildBinding.setCount({ count: 'four' })
  // @ts-expect-error Initialization retains the exact child argument tuple.
  ChildBinding.init({ args: ['four'], toParentModel: model => model })
  // @ts-expect-error A foreign parent's graph cannot register this declaration.
  ForeignDefinition.makeComposition({ bindings: [ChildBinding] })
  // @ts-expect-error Explicit descriptor forwarding is exhaustive.
  ParentDefinition.makeOutMessageForward(ChildDefinition.contract, {
    NotifiedCount: ({ count }) => ParentOutMessage.ReportedCount({ count }),
  })
  // @ts-expect-error Forward handlers may not invent child OutMessage tags.
  ParentDefinition.makeOutMessageForward(ChildDefinition.contract, {
    NotifiedCount: ({ count }) => ParentOutMessage.ReportedCount({ count }),
    Dismissed: () => undefined,
    Missing: () => undefined,
  })
  // @ts-expect-error Forward results must be compatible with the parent OutMessage.
  ParentDefinition.makeOutMessageForward(ChildDefinition.contract, {
    NotifiedCount: () => ChildOutMessage.NotifiedCount({ count: 1 }),
    Dismissed: () => undefined,
  })
  // @ts-expect-error A forward must forward at least one named child variant.
  ParentDefinition.makeOutMessageForward(ChildDefinition.contract, {
    NotifiedCount: () => undefined,
    Dismissed: () => undefined,
  })
}

export const acceptedVariantStory = Story.story(
  VariantParent,
  Story.init(3),
  Story.message(ParentMessage.RequestedSetCount({ count: 8 })),
  Story.message(ParentMessage.RequestedNotify()),
  Story.expectOutMessage(ParentOutMessage.ReportedCount({ count: 8 })),
)
