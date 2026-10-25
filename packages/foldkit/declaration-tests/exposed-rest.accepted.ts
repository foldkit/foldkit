import { Layer, Option, Schema, Tuple } from 'effect'
import { Block, Message, Struct } from 'foldkit'

export const ChildModel = Schema.Struct({ count: Schema.Number })
type ChildModel = typeof ChildModel.Type
const ChildMessage = Message.defineMessageUnion({
  RequestedDefaultIncrement: { amount: Schema.optionalKey(Schema.Number) },
  RequestedAddMany: { amounts: Schema.Array(Schema.Number) },
  RequestedRequiredPrefix: {
    first: Schema.Number,
    labels: Schema.Array(Schema.String),
  },
  RequestedOptionalPrefix: {
    first: Schema.optionalKey(Schema.Number),
    labels: Schema.Array(Schema.String),
  },
  RequestedMixed: {
    values: Schema.Array(Schema.Union([Schema.Number, Schema.String])),
  },
  RequestedReset: {},
})
// oxlint-disable-next-line foldkit/block-name-matches-variable -- This fixture deliberately uses a distinct literal Block identity for type coverage.

// oxlint-disable-next-line foldkit/block-name-matches-variable -- This fixture deliberately uses a distinct literal Block identity for type coverage.
const ChildComposition = Block.makeDefinition('EmittedRestChild', {
  Model: ChildModel,
  Message: ChildMessage,
}).makeComposition()
const childUpdate = ChildComposition.makeUpdate({
  RequestedDefaultIncrement: (model, { amount = 1 }) => ({
    model: Struct.modifyFields(model, { count: count => count + amount }),
  }),
  RequestedAddMany: (model, { amounts }) => ({
    model: Struct.modifyFields(model, {
      count: count => count + amounts.reduce((sum, amount) => sum + amount, 0),
    }),
  }),
  RequestedRequiredPrefix: (model, { first, labels }) => ({
    model: Struct.modifyFields(model, {
      count: count => count + first + labels.length,
    }),
  }),
  RequestedOptionalPrefix: (model, { first = 0, labels }) => ({
    model: Struct.modifyFields(model, {
      count: count => count + first + labels.length,
    }),
  }),
  RequestedMixed: (model, { values }) => ({
    model: Struct.modifyFields(model, {
      count: count => count + values.length,
    }),
  }),
  RequestedReset: model => ({ model: ChildModel.make({ count: 0 }) }),
})
const prepareChildBlock = () =>
  ChildComposition.prepareBlock({
    init: () => ({ model: ChildModel.make({ count: 0 }) }),
    update: childUpdate,
    operations: {
      defaultIncrement: (amount?: number) =>
        Tuple.make(
          ChildMessage.RequestedDefaultIncrement(
            amount === undefined ? {} : { amount },
          ),
        ),
      addMany: (...amounts: ReadonlyArray<number>) =>
        Tuple.make(ChildMessage.RequestedAddMany({ amounts })),
      addRequiredPrefix: (
        ...[first, ...labels]: readonly [
          first: number,
          ...labels: Array<string>,
        ]
      ) => Tuple.make(ChildMessage.RequestedRequiredPrefix({ first, labels })),
      addOptionalPrefix: (
        ...[first, ...labels]: readonly [
          first?: number,
          ...labels: Array<string>,
        ]
      ) =>
        Tuple.make(
          ChildMessage.RequestedOptionalPrefix(
            first === undefined ? { labels } : { first, labels },
          ),
        ),
      addMixed: (...values: ReadonlyArray<number | string>) =>
        Tuple.make(ChildMessage.RequestedMixed({ values })),
      addRefined: (...amounts: ReadonlyArray<1 | 2>) =>
        Tuple.make(ChildMessage.RequestedAddMany({ amounts })),
      reset: () => Tuple.make(ChildMessage.RequestedReset()),
    },
    EffectsLayer: Layer.empty,
  })
export const ChildBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ChildModel,
  typeof prepareChildBlock
> = Block.assemble(prepareChildBlock)

const ParentModel = Schema.Struct({ child: ChildModel })
const ParentMessage = Message.defineMessageUnion({
  GotChildMessage: { message: ChildMessage },
})
// oxlint-disable-next-line foldkit/block-name-matches-variable -- This fixture deliberately uses a distinct literal Block identity for type coverage.
const ParentDefinition = Block.makeDefinition('EmittedRestParent', {
  Model: ParentModel,
  Message: ParentMessage,
})
export const ChildBinding = ParentDefinition.makeBinding(ChildBlock, {
  read: model => Option.some(model.child),
  write: (model, child) => Struct.modifyFields(model, { child: () => child }),
})

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Assert<Value extends true> = Value

type SameArguments<
  Actual extends ReadonlyArray<unknown>,
  Expected extends ReadonlyArray<unknown>,
> = ((...args: Actual) => void) extends (...args: Expected) => void
  ? ((...args: Expected) => void) extends (...args: Actual) => void
    ? true
    : false
  : false

type CompletedRest = Assert<
  Equal<
    Parameters<typeof ChildBlock.operations.addMany>,
    [model: ChildModel, ...amounts: Array<number>]
  >
>
type BoundRest = Assert<
  Equal<Parameters<typeof ChildBinding.addMany>, Array<number>>
>
type CompletedRequiredPrefix = Assert<
  Equal<
    Parameters<typeof ChildBlock.operations.addRequiredPrefix>,
    [model: ChildModel, first: number, ...labels: Array<string>]
  >
>
type BoundRequiredPrefix = Assert<
  Equal<
    Parameters<typeof ChildBinding.addRequiredPrefix>,
    [first: number, ...labels: Array<string>]
  >
>
type CompletedOptionalPrefix = Assert<
  SameArguments<
    Parameters<typeof ChildBlock.operations.addOptionalPrefix>,
    [model: ChildModel, first?: number | undefined, ...labels: Array<string>]
  >
>
type BoundOptionalPrefix = Assert<
  SameArguments<
    Parameters<typeof ChildBinding.addOptionalPrefix>,
    [first?: number | undefined, ...labels: Array<string>]
  >
>
type ExactOptionalPayload = Assert<
  Equal<
    Parameters<typeof ChildBinding.addOptionalPrefix>[0],
    number | undefined
  >
>
type CompletedMixed = Assert<
  Equal<
    Parameters<typeof ChildBlock.operations.addMixed>,
    [model: ChildModel, ...values: Array<number | string>]
  >
>
type BoundMixed = Assert<
  Equal<Parameters<typeof ChildBinding.addMixed>, Array<number | string>>
>
type CompletedRefined = Assert<
  Equal<
    Parameters<typeof ChildBlock.operations.addRefined>,
    [model: ChildModel, ...amounts: Array<1 | 2>]
  >
>
type BoundRefined = Assert<
  Equal<Parameters<typeof ChildBinding.addRefined>, Array<1 | 2>>
>
type CompletedDefault = Assert<
  Equal<
    Parameters<typeof ChildBlock.operations.defaultIncrement>,
    [model: ChildModel, amount?: number | undefined]
  >
>
type BoundDefault = Assert<
  Equal<
    Parameters<typeof ChildBinding.defaultIncrement>,
    [amount?: number | undefined]
  >
>
type CompletedNoArg = Assert<
  Equal<Parameters<typeof ChildBlock.operations.reset>, [model: ChildModel]>
>
type BoundNoArg = Assert<Equal<Parameters<typeof ChildBinding.reset>, []>>

export type EmittedRestProof = readonly [
  CompletedRest,
  BoundRest,
  CompletedRequiredPrefix,
  BoundRequiredPrefix,
  CompletedOptionalPrefix,
  BoundOptionalPrefix,
  ExactOptionalPayload,
  CompletedMixed,
  BoundMixed,
  CompletedRefined,
  BoundRefined,
  CompletedDefault,
  BoundDefault,
  CompletedNoArg,
  BoundNoArg,
]
