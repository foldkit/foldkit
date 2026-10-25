import { Array, Context, Effect, Layer, Option, Schema, Tuple } from 'effect'
import * as Block from 'foldkit/block'
import * as Command from 'foldkit/command'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'
import * as Update from 'foldkit/update'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value

export class RequiredService extends Context.Service<
  RequiredService,
  Readonly<{ prefix: string }>
>()('OperationConstructorProof/RequiredService') {}

export class ProvidedService extends Context.Service<
  ProvidedService,
  Readonly<{ value: string }>
>()('OperationConstructorProof/ProvidedService') {}

export class LayerFailure {
  readonly _tag = 'LayerFailure'
}

export const Model = Schema.Struct({ value: Schema.String })
export type Model = typeof Model.Type
export const Message = defineMessageUnion({
  ResetValue: {},
  UpdatedValue: {
    value: Schema.String,
    source: Schema.String.pipe(
      Schema.withConstructorDefault(Effect.succeed('default')),
    ),
  },
  CompletedRecordValue: { value: Schema.String },
})
export type Message = typeof Message.Type
export const OutMessage = defineMessageUnion({
  ChangedValue: { value: Schema.String },
})
export type OutMessage = typeof OutMessage.Type

export const OperationConstructorProofChildDefinition = Block.makeDefinition(
  'OperationConstructorProofChild',
  {
    Model,
    Message,
    OutMessage,
  },
)
export const RecordValue = OperationConstructorProofChildDefinition.makeCommand(
  'RecordValue',
  {
    args: { value: Schema.String },
    messages: [Message.CompletedRecordValue],
  },
)
export const OperationConstructorProofChildComposition =
  OperationConstructorProofChildDefinition.makeComposition()
export const update =
  OperationConstructorProofChildComposition.makeUpdate.withContext(
    (
      required: Readonly<{
        prefix: string
      }>,
      maybeSuffix?: string,
      separator: string = ':',
      ...indexes: ReadonlyArray<number>
    ) => ({
      ResetValue: (
        model,
      ): Update.ReturnWithOutMessage<
        Model,
        Message,
        OutMessage,
        Command.HandlerOf<typeof RecordValue>
      > => ({ model: modifyFields(model, { value: () => '' }) }),
      UpdatedValue: (
        model,
        { source, value },
      ): Update.ReturnWithOutMessage<
        Model,
        Message,
        OutMessage,
        Command.HandlerOf<typeof RecordValue>
      > => {
        const nextValue = `${required.prefix}${separator}${source}${separator}${value}${maybeSuffix ?? ''}${indexes.join('')}`
        return {
          model: modifyFields(model, { value: () => nextValue }),
          commands: [RecordValue({ value: nextValue })],
          outMessage: OutMessage.ChangedValue({ value: nextValue }),
        }
      },
      CompletedRecordValue: (
        model,
      ): Update.ReturnWithOutMessage<
        Model,
        Message,
        OutMessage,
        Command.HandlerOf<typeof RecordValue>
      > => ({ model }),
    }),
  )

export const resetValue = Message.ResetValue
export const updateValue = Message.UpdatedValue
export const EffectsLayer = Layer.merge(
  Layer.empty,
  Layer.effect(
    ProvidedService,
    Effect.gen(function* () {
      const requiredService = yield* RequiredService
      if (requiredService.prefix.length === 0) {
        return yield* Effect.fail(new LayerFailure())
      }

      return ProvidedService.of({ value: requiredService.prefix })
    }),
  ),
)

const prepareChildBlock = () =>
  OperationConstructorProofChildComposition.prepareBlock({
    init: () => ({ model: Model.make({ value: '' }) }),
    update,
    operations: {
      resetValue,
      updateValue,
      updatePositionally: (
        value: string,
        required: Readonly<{ prefix: string }>,
      ) => Tuple.make(Message.UpdatedValue({ value }), required),
      updateRefined: (value: 'First' | 'Second') =>
        Tuple.make(
          Message.UpdatedValue({ value }),
          { prefix: 'refined' },
          undefined,
          undefined,
        ),
    },
    EffectsLayer,
    hostHandlers: [RecordValue],
  })
export const ChildBlock: Block.FromAssemblyWithOutMessage<
  typeof Model,
  typeof prepareChildBlock
> = Block.assemble(prepareChildBlock)

export const ParentModel = Schema.Struct({
  maybeChild: Schema.Option(Model),
  entries: Schema.Array(Schema.Struct({ id: Schema.String, child: Model })),
})
export type ParentModel = typeof ParentModel.Type
export const ParentMessage = defineMessageUnion({
  RequestedUpdateChild: { value: Schema.String },
  RequestedUpdateEntry: { id: Schema.String, value: Schema.String },
})
export const OperationConstructorProofParentDefinition = Block.makeDefinition(
  'OperationConstructorProofParent',
  {
    Model: ParentModel,
    Message: ParentMessage,
  },
)
export const ChildBinding =
  OperationConstructorProofParentDefinition.makeBinding(ChildBlock, {
    placement: 'child',
    read: model => model.maybeChild,
    write: (model, nextChild) =>
      modifyFields(model, { maybeChild: () => Option.some(nextChild) }),
    delivery: {
      toUpdateContext: () => [{ prefix: 'routed' }],
    },
  }).withOutMessagePolicy({
    fold: OutMessage.match<Update.Step<ParentModel, typeof ParentMessage.Type>>(
      {
        ChangedValue: () => model => ({ model }),
      },
    ),
  })
export const EntryBinding =
  OperationConstructorProofParentDefinition.makeBinding(ChildBlock, {
    placement: 'entries',
    readAll: model => model.entries,
    key: entry => entry.id,
    keySchema: Schema.String,
    read: entry => entry.child,
    writeAt: (model, id, nextChild) =>
      modifyFields(model, {
        entries: Array.map(entry =>
          entry.id === id ? { ...entry, child: nextChild } : entry,
        ),
      }),
    delivery: {
      toUpdateContext: () => [{ prefix: 'routed' }],
    },
  }).withOutMessagePolicy({
    fold: (_id, outMessage) =>
      OutMessage.match<Update.Step<ParentModel, typeof ParentMessage.Type>>(
        outMessage,
        {
          ChangedValue: () => model => ({ model }),
        },
      ),
  })
export const OperationConstructorProofParentComposition =
  OperationConstructorProofParentDefinition.makeComposition({
    bindings: [ChildBinding, EntryBinding],
  })

const prepareParentBlock = () =>
  OperationConstructorProofParentComposition.prepareBlock({
    init: () => ({
      model: ParentModel.make({ maybeChild: Option.none(), entries: [] }),
    }),
    update: OperationConstructorProofParentComposition.makeUpdate({
      RequestedUpdateChild: (model, { value }) =>
        ChildBinding.updateValue({ value }, { prefix: 'parent' })(model),
      RequestedUpdateEntry: (model, { id, value }) =>
        EntryBinding.updateValue(id, { value }, { prefix: 'parent' })(model),
    }),
    operations: {
      updateChild: ParentMessage.RequestedUpdateChild,
      updateEntry: ParentMessage.RequestedUpdateEntry,
    },
    EffectsLayer: RecordValue.toLayer(
      Effect.succeed(({ value }) =>
        Effect.succeed(Message.CompletedRecordValue({ value })),
      ),
    ),
  })
export const ParentBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ParentModel,
  typeof prepareParentBlock
> = Block.assemble(prepareParentBlock)

export function makeChoice<
  const Values extends readonly [string, ...Array<string>],
>(values: Values) {
  const Value = Schema.Literals(values)
  const ChoiceModel = Schema.Struct({ selected: Value })
  const ChoiceMessage = defineMessageUnion({ SelectedValue: { value: Value } })

  const OperationConstructorProofChoiceComposition = Block.makeDefinition(
    'OperationConstructorProofChoice',
    {
      Model: ChoiceModel,
      Message: ChoiceMessage,
    },
  ).makeComposition()
  const select = ChoiceMessage.SelectedValue

  const prepare = () =>
    OperationConstructorProofChoiceComposition.prepareBlock({
      init: (selected: Values[number]) => ({
        model: ChoiceModel.make({ selected }),
      }),
      update: OperationConstructorProofChoiceComposition.makeUpdate({
        SelectedValue: (model, { value }) => ({
          model: modifyFields(model, { selected: () => value }),
        }),
      }),
      operations: {
        select,
        selectPositionally: (value: Values[number]) =>
          Tuple.make(ChoiceMessage.SelectedValue({ value })),
      },
      EffectsLayer: Layer.empty,
    })
  const completedBlock: Block.FromAssemblyWithoutViewOrOutMessage<
    typeof ChoiceModel,
    typeof prepare
  > = Block.assemble(prepare)
  return completedBlock
}

export const Choice = makeChoice(['First', 'Second'])

type ConstructorSourceInputRemains = Expect<
  Equal<
    Parameters<typeof updateValue>,
    [value: (typeof Message.UpdatedValue)['~type.make.in']]
  >
>
type ConstructorSourceReturnRemains = Expect<
  Equal<ReturnType<typeof updateValue>, typeof Message.UpdatedValue.Type>
>
type EmptyConstructorArguments = Expect<
  Equal<
    Parameters<typeof ChildBlock.operations.resetValue>,
    [
      model: Model,
      required: Readonly<{ prefix: string }>,
      maybeSuffix?: string | undefined,
      separator?: string | undefined,
      ...indexes: ReadonlyArray<number>,
    ]
  >
>
type ConstructorPayloadAcceptsDecoded = Expect<
  Omit<typeof Message.UpdatedValue.Type, '_tag'> extends Parameters<
    typeof ChildBlock.operations.updateValue
  >[1]
    ? true
    : false
>
type ConstructorPayloadAcceptsMakeInput = Expect<
  (typeof Message.UpdatedValue)['~type.make.in'] extends Parameters<
    typeof ChildBlock.operations.updateValue
  >[1]
    ? true
    : false
>
type DirectBindingContext = Expect<
  Equal<
    Parameters<typeof ChildBinding.updateValue> extends readonly [
      payload: infer _Payload,
      ...context: infer Context,
    ]
      ? Context
      : never,
    [
      required: Readonly<{ prefix: string }>,
      maybeSuffix?: string | undefined,
      separator?: string | undefined,
      ...indexes: ReadonlyArray<number>,
    ]
  >
>
type KeyedBindingStartsWithKey = Expect<
  Equal<Parameters<typeof EntryBinding.updateValue>[0], string>
>
type CommandRequirementsRemain = Expect<
  Equal<
    Update.RequirementsOf<typeof ChildBlock.operations.updateValue>,
    Command.HandlerOf<typeof RecordValue>
  >
>
type BindingRegistrationRemains = Expect<
  Equal<
    Update.RegistrationEvidenceOf<
      ReturnType<ReturnType<typeof EntryBinding.updateValue>>
    >,
    Block.RequirementOfBinding<typeof EntryBinding>
  >
>
type ParentChildCommandRequirementsRemainExact = Expect<
  Equal<
    Update.RequirementsOf<typeof ParentBlock.operations.updateChild>,
    Block.Scoped<'child', Command.HandlerOf<typeof RecordValue>>
  >
>
type ParentEntryCommandRequirementsRemainExact = Expect<
  Equal<
    Update.RequirementsOf<typeof ParentBlock.operations.updateEntry>,
    Block.Scoped<'entries', Command.HandlerOf<typeof RecordValue>>
  >
>
type ParentAggregateCommandRequirementsRemain = Expect<
  Equal<
    Update.RequirementsOf<typeof ParentBlock.update>,
    | Block.Scoped<'child', Command.HandlerOf<typeof RecordValue>>
    | Block.Scoped<'entries', Command.HandlerOf<typeof RecordValue>>
  >
>
type ParentRegistrationIsResolved = Expect<
  Equal<
    Update.RegistrationEvidenceOf<
      ReturnType<typeof ParentBlock.operations.updateEntry>
    >,
    never
  >
>
type OutMessageRemains = Expect<
  ReturnType<
    typeof ChildBlock.operations.updateValue
  > extends Update.ReturnWithOutMessage<Model, Message, infer Value, unknown>
    ? Equal<Value, OutMessage>
    : false
>
type LayerErrorRemains = Expect<
  Equal<Layer.Error<typeof ChildBlock.EffectsLayer>, LayerFailure>
>
type LayerServicesRemain = Expect<
  Equal<Layer.Services<typeof ChildBlock.EffectsLayer>, RequiredService>
>
type GenericPayloadRemains = Expect<
  Equal<
    Omit<typeof Choice.Message.SelectedValue.Type, '_tag'>,
    Readonly<{ value: 'First' | 'Second' }>
  >
>
type GenericPositionalProducerRemains = Expect<
  Equal<
    Parameters<typeof Choice.operations.selectPositionally>,
    [model: typeof Choice.Model.Type, value: 'First' | 'Second']
  >
>
type NoExposeAlias = Expect<
  Equal<'expose' extends keyof typeof ChildBlock ? true : false, false>
>

export type OperationConstructorAssertions = readonly [
  ConstructorSourceInputRemains,
  ConstructorSourceReturnRemains,
  EmptyConstructorArguments,
  ConstructorPayloadAcceptsDecoded,
  ConstructorPayloadAcceptsMakeInput,
  DirectBindingContext,
  KeyedBindingStartsWithKey,
  CommandRequirementsRemain,
  BindingRegistrationRemains,
  ParentChildCommandRequirementsRemainExact,
  ParentEntryCommandRequirementsRemainExact,
  ParentAggregateCommandRequirementsRemain,
  ParentRegistrationIsResolved,
  OutMessageRemains,
  LayerErrorRemains,
  LayerServicesRemain,
  GenericPayloadRemains,
  GenericPositionalProducerRemains,
  NoExposeAlias,
]

export const makeNamed = <const Name extends string>(name: Name) => {
  const NamedOwnerNamespace = Block.makeNamespace(name)

  const NamedComposition = NamedOwnerNamespace.makeDefinition({
    Model,
    Message,
  }).makeComposition()

  const prepare = () =>
    NamedComposition.prepareBlock({
      init: () => ({ model: Model.make({ value: '' }) }),
      update: NamedComposition.makeUpdate({
        UpdatedValue: model => ({ model }),
        ResetValue: model => ({ model }),
        CompletedRecordValue: model => ({ model }),
      }),
      operations: {
        reset: Message.ResetValue,
      },
    })
  const completedBlock: Block.FromAssemblyWithoutViewOrOutMessage<
    typeof Model,
    typeof prepare
  > = Block.assemble(prepare)
  return completedBlock
}
