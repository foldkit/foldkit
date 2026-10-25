import { Effect, Layer, Schema, Stream, Tuple } from 'effect'
import { Block, Message, Struct, Update } from 'foldkit'
import { makeVariantBinding } from 'foldkit/variantBinding'

export const Active = Schema.Struct({
  _tag: Schema.Literal('Active'),
  count: Schema.Number,
})
export const Inactive = Schema.Struct({
  _tag: Schema.Literal('Inactive'),
  reason: Schema.String,
})
export const ParentModel = Schema.Union([Active, Inactive])
export const ChildMessage = Message.defineMessageUnion({
  UpdatedCount: { count: Schema.Number },
  CompletedInitialization: { count: Schema.Number },
  RequestedNotify: {},
})
export const ChildOutMessage = Message.defineMessageUnion({
  NotifiedCount: { count: Schema.Number },
})
export const ChildDefinition = Block.makeDefinition('VariantActive', {
  Model: Active,
  Message: ChildMessage,
  OutMessage: ChildOutMessage,
})
export const ChildComposition = ChildDefinition.makeComposition()
export const FinishInitialization = ChildDefinition.makeCommand(
  'FinishInitialization',
  {
    args: { count: Schema.Number },
    messages: [ChildMessage.CompletedInitialization],
    handler: function* () {
      return ({ count }) =>
        Effect.succeed(ChildMessage.CompletedInitialization({ count }))
    },
  },
)
export const lifecycleEvents: Array<string> = []
const subscriptions = ChildDefinition.makeSubscriptions(entry => ({
  activity: entry('ObserveActivity', {
    messages: [],
    handler: function* () {
      yield* Effect.acquireRelease(
        Effect.sync(() => {
          lifecycleEvents.push('handler acquired')
        }),
        () =>
          Effect.sync(() => {
            lifecycleEvents.push('handler released')
          }),
      )
      return () =>
        Stream.fromEffect(
          Effect.sync(() => {
            lifecycleEvents.push('stream started')
          }),
        ).pipe(
          Stream.flatMap(() => Stream.never),
          Stream.ensuring(
            Effect.sync(() => {
              lifecycleEvents.push('stream stopped')
            }),
          ),
        )
    },
  }),
}))
const prepareChild = () =>
  ChildComposition.prepareBlock({
    init: ChildComposition.makeInit((count: number) => ({
      model: Active.make({ _tag: 'Active', count }),
      commands: [FinishInitialization({ count })],
    })),
    update: ChildComposition.makeUpdate({
      UpdatedCount: ChildDefinition.makeFieldsStep.fromMessage(({ count }) => ({
        count: () => count,
      })),
      CompletedInitialization: ChildDefinition.makeFieldsStep.fromMessage(
        ({ count }) => ({
          count: () => count,
        }),
      ),
      RequestedNotify: ChildDefinition.makeOutMessageStep(model =>
        ChildOutMessage.NotifiedCount({ count: model.count }),
      ),
    }),
    operations: {
      setCount: (count: number) =>
        Tuple.make(ChildMessage.UpdatedCount({ count })),
      notify: () => Tuple.make(ChildMessage.RequestedNotify()),
    },
    subscriptions,
    EffectsLayer: Layer.merge(FinishInitialization.layer, subscriptions.layer),
  })
export const ChildBlock: Block.FromAssemblyWithOutMessage<
  typeof Active,
  typeof prepareChild
> = Block.assemble(prepareChild)
export const ParentMessage = Message.defineMessageUnion({
  RequestedSetCount: { count: Schema.Number },
  RequestedNotify: {},
})
export const ParentDefinition = Block.makeDefinition('VariantParent', {
  Model: ParentModel,
  Message: ParentMessage,
})
const foldChildOutMessage = ParentDefinition.makeOutMessageFold(ChildBlock, {
  NotifiedCount: ParentDefinition.makeNoopStep,
})
export const UnselectedBinding = makeVariantBinding(
  ParentDefinition,
  ChildBlock,
)
export const ChildBinding = UnselectedBinding.withOutMessagePolicy({
  fold: foldChildOutMessage,
})
export const GatedBinding = makeVariantBinding(ParentDefinition, ChildBlock, {
  placement: 'gatedActive',
  subscriptions: { when: model => model._tag === 'Active' && model.count > 0 },
  delivery: { when: model => model._tag === 'Active' && model.count > 0 },
}).withOutMessagePolicy({ fold: foldChildOutMessage })
export const StreamGatedBinding = makeVariantBinding(
  ParentDefinition,
  ChildBlock,
  {
    subscriptions: { when: { activity: model => model._tag === 'Active' } },
  },
).withOutMessagePolicy({ fold: foldChildOutMessage })
export const ParentComposition = ParentDefinition.makeComposition({
  bindings: [ChildBinding],
})
export const initialize = ParentComposition.makeInit((count: number) =>
  ChildBinding.init({
    args: [count],
    toParentModel: child => child,
  }),
)
export const update = ParentComposition.makeUpdate({
  RequestedSetCount: (model, { count }) => ChildBinding.setCount(count)(model),
  RequestedNotify: model => ChildBinding.notify()(model),
})
const prepareParent = () =>
  ParentComposition.prepareBlock({
    init: initialize,
    update,
    operations: {
      setCount: (count: number) =>
        Tuple.make(ParentMessage.RequestedSetCount({ count })),
    },
  })
export const ParentBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ParentModel,
  typeof prepareParent
> = Block.assemble(prepareParent)

const ContextComposition = Block.makeDefinition('VariantContextChild', {
  Model: Active,
  Message: ChildMessage,
}).makeComposition()
const prepareContextChild = () =>
  ContextComposition.prepareBlock({
    init: ContextComposition.makeInit(() => ({
      model: Active.make({ _tag: 'Active', count: 0 }),
    })),
    update: ContextComposition.makeUpdate.withContext((amount: number) => ({
      UpdatedCount: (model, { count }) => ({
        model: Struct.modifyFields(model, { count: () => count + amount }),
      }),
      CompletedInitialization: model => ({ model }),
      RequestedNotify: model => ({ model }),
    })),
  })
export const ContextChild: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof Active,
  typeof prepareContextChild
> = Block.assemble(prepareContextChild)
export const ContextBinding = makeVariantBinding(
  ParentDefinition,
  ContextChild,
  {
    delivery: {
      toUpdateContext: model =>
        Tuple.make(model._tag === 'Active' ? model.count : 0),
    },
  },
)
const SilentComposition = Block.makeDefinition('VariantSilentChild', {
  Model: Active,
  Message: Schema.Never,
}).makeComposition()
const prepareSilentChild = () =>
  SilentComposition.prepareBlock({
    init: SilentComposition.makeInit(() => ({
      model: Active.make({ _tag: 'Active', count: 0 }),
    })),
    update: SilentComposition.makeUpdate({}),
  })
export const SilentChild: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof Active,
  typeof prepareSilentChild
> = Block.assemble(prepareSilentChild)
export const SilentBinding = makeVariantBinding(ParentDefinition, SilentChild)

type OutMessageOf<Output> = 'outMessage' extends keyof Output
  ? Output extends Readonly<{ outMessage?: infer OutMessage }>
    ? Exclude<OutMessage, undefined>
    : never
  : never
type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Assert<Value extends true> = Value
export type PreservedChild = Assert<
  Equal<Block.BlockOfBinding<typeof ChildBinding>, typeof ChildBlock>
>
export type PreservedPlacement = Assert<
  Equal<typeof ChildBinding.placement, 'VariantActive'>
>
export type CustomPlacement = Assert<
  Equal<typeof GatedBinding.placement, 'gatedActive'>
>
export type ExactOperationOutput = Assert<
  Equal<OutMessageOf<ReturnType<typeof ChildBlock.operations.setCount>>, never>
>
export type ExactNotifiedOutput = Assert<
  Equal<
    OutMessageOf<ReturnType<typeof ChildBlock.operations.notify>>,
    typeof ChildOutMessage.Type
  >
>

export type ExactOperationRequirements = Assert<
  Equal<Update.RequirementsOf<typeof ChildBlock.operations.setCount>, never>
>

const GatedComposition = ParentDefinition.makeComposition({
  bindings: [GatedBinding],
})
const prepareGated = () =>
  GatedComposition.prepareBlock({
    init: GatedComposition.makeInit(() => ({
      model: Active.make({ _tag: 'Active', count: 0 }),
    })),
    update: GatedComposition.makeUpdate({
      RequestedSetCount: (model, { count }) =>
        GatedBinding.setCount(count)(model),
      RequestedNotify: model => GatedBinding.notify()(model),
    }),
  })
export const GatedParentBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ParentModel,
  typeof prepareGated
> = Block.assemble(prepareGated)

const OptionalContextComposition = Block.makeDefinition(
  'VariantOptionalContextChild',
  {
    Model: Active,
    Message: ChildMessage,
  },
).makeComposition()
const prepareOptionalContextChild = () =>
  OptionalContextComposition.prepareBlock({
    init: OptionalContextComposition.makeInit(() => ({
      model: Active.make({ _tag: 'Active', count: 0 }),
    })),
    update: OptionalContextComposition.makeUpdate.withContext(
      (amount?: number) => ({
        UpdatedCount: (model, { count }) => ({
          model: Struct.modifyFields(model, {
            count: () => count + (amount ?? 0),
          }),
        }),
        CompletedInitialization: model => ({ model }),
        RequestedNotify: model => ({ model }),
      }),
    ),
  })
export const OptionalContextChild: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof Active,
  typeof prepareOptionalContextChild
> = Block.assemble(prepareOptionalContextChild)
export const OptionalContextBinding = makeVariantBinding(
  ParentDefinition,
  OptionalContextChild,
  { delivery: { toUpdateContext: () => Tuple.make() } },
)

const DefaultContextComposition = Block.makeDefinition(
  'VariantDefaultContextChild',
  {
    Model: Active,
    Message: ChildMessage,
  },
).makeComposition()
const prepareDefaultContextChild = () =>
  DefaultContextComposition.prepareBlock({
    init: DefaultContextComposition.makeInit(() => ({
      model: Active.make({ _tag: 'Active', count: 0 }),
    })),
    update: DefaultContextComposition.makeUpdate.withContext(
      (amount: number = 0) => ({
        UpdatedCount: (model, { count }) => ({
          model: Struct.modifyFields(model, { count: () => count + amount }),
        }),
        CompletedInitialization: model => ({ model }),
        RequestedNotify: model => ({ model }),
      }),
    ),
  })
export const DefaultContextChild: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof Active,
  typeof prepareDefaultContextChild
> = Block.assemble(prepareDefaultContextChild)
export const DefaultContextBinding = makeVariantBinding(
  ParentDefinition,
  DefaultContextChild,
  { delivery: { toUpdateContext: () => Tuple.make() } },
)

const RestContextComposition = Block.makeDefinition('VariantRestContextChild', {
  Model: Active,
  Message: ChildMessage,
}).makeComposition()
const prepareRestContextChild = () =>
  RestContextComposition.prepareBlock({
    init: RestContextComposition.makeInit(() => ({
      model: Active.make({ _tag: 'Active', count: 0 }),
    })),
    update: RestContextComposition.makeUpdate.withContext(
      (...amounts: ReadonlyArray<number>) => ({
        UpdatedCount: (model, { count }) => ({
          model: Struct.modifyFields(model, {
            count: () => count + amounts.length,
          }),
        }),
        CompletedInitialization: model => ({ model }),
        RequestedNotify: model => ({ model }),
      }),
    ),
  })
export const RestContextChild: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof Active,
  typeof prepareRestContextChild
> = Block.assemble(prepareRestContextChild)
export const RestContextBinding = makeVariantBinding(
  ParentDefinition,
  RestContextChild,
  { delivery: { toUpdateContext: () => Tuple.make(1, 2) } },
)
