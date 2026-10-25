import { Context, Effect, Layer, Schema, Tuple } from 'effect'
import * as Block from 'foldkit/block'
import * as Command from 'foldkit/command'
import { defineMessageUnion } from 'foldkit/message'
import * as Mount from 'foldkit/mount'
import { modifyFields } from 'foldkit/struct'
import * as Update from 'foldkit/update'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value

export class Recorder extends Context.Service<
  Recorder,
  Readonly<{ record(value: string): void }>
>()('ExposeMessageProof/Recorder') {}

export const ChildModel = Schema.Struct({ value: Schema.String })
export type ChildModel = typeof ChildModel.Type
export const ChildMessage = defineMessageUnion({
  RequestedReset: {},
  UpdatedValue: { value: Schema.String },
  CompletedRecord: {},
})
export type ChildMessage = typeof ChildMessage.Type
export const ChildOutMessage = defineMessageUnion({
  ChangedValue: { value: Schema.String },
})
export type ChildOutMessage = typeof ChildOutMessage.Type

// oxlint-disable-next-line foldkit/block-name-matches-variable -- This fixture deliberately uses a distinct literal Block identity for type coverage.
export const ChildDefinition = Block.makeDefinition('ExposeMessageProofChild', {
  Model: ChildModel,
  Message: ChildMessage,
  OutMessage: ChildOutMessage,
})
export const RecordValue = ChildDefinition.makeCommand('RecordValue', {
  args: { value: Schema.String },
  messages: [ChildMessage.CompletedRecord],
})
// oxlint-disable-next-line foldkit/block-name-matches-variable -- This fixture deliberately uses a distinct literal Block identity for type coverage.
export const ChildComposition = ChildDefinition.makeComposition()
export const childUpdate = ChildComposition.makeUpdate({
  RequestedReset: (
    model,
  ): Update.ReturnWithOutMessage<
    ChildModel,
    ChildMessage,
    ChildOutMessage,
    Command.HandlerOf<typeof RecordValue>
  > => ({
    model: modifyFields(model, { value: () => '' }),
  }),
  UpdatedValue: (
    model,
    { value },
  ): Update.ReturnWithOutMessage<
    ChildModel,
    ChildMessage,
    ChildOutMessage,
    Command.HandlerOf<typeof RecordValue>
  > => ({
    model: modifyFields(model, { value: () => value }),
    commands: [RecordValue({ value })],
    outMessage: ChildOutMessage.ChangedValue({ value }),
  }),
  CompletedRecord: (
    model,
  ): Update.ReturnWithOutMessage<
    ChildModel,
    ChildMessage,
    ChildOutMessage,
    Command.HandlerOf<typeof RecordValue>
  > => ({ model }),
})

export const prepareChildBlock = () =>
  ChildComposition.prepareBlock({
    init: () => ({ model: ChildModel.make({ value: 'initial' }) }),
    update: childUpdate,
    operations: {
      reset: () => [ChildMessage.RequestedReset()],
      setValue: (value: string) => [ChildMessage.UpdatedValue({ value })],
    },
    EffectsLayer: Layer.empty,
    hostHandlers: [RecordValue],
  })

export const RawChildBlock: CompletedAssembly<typeof prepareChildBlock> =
  Block.assemble(prepareChildBlock)
export const ChildBlock: Block.FromAssemblyWithOutMessage<
  typeof ChildComposition.Model,
  typeof prepareChildBlock
> = Block.assemble(prepareChildBlock)

export const ContextModel = Schema.Struct({ value: Schema.String })
export const ContextMessage = defineMessageUnion({
  UpdatedValue: { value: Schema.String },
})
export type RequiredContext = Readonly<{ source: string }>
// oxlint-disable-next-line foldkit/block-name-matches-variable -- This fixture deliberately uses a distinct literal Block identity for type coverage.
export const ContextChildDefinition = Block.makeDefinition(
  'ExposeMessageProofContextChild',
  {
    Model: ContextModel,
    Message: ContextMessage,
  },
)
// oxlint-disable-next-line foldkit/block-name-matches-variable -- This fixture deliberately uses a distinct literal Block identity for type coverage.
export const ContextComposition = ContextChildDefinition.makeComposition()
export const contextUpdate = ContextComposition.makeUpdate.withContext(
  (
    required: RequiredContext,
    maybeCount?: number,
    label = 'default',
    ...flags: ReadonlyArray<boolean>
  ) => ({
    UpdatedValue: (model, { value }) => ({
      model: modifyFields(model, {
        value: () =>
          `${required.source}:${value}:${maybeCount ?? 0}:${label}:${flags.length}`,
      }),
    }),
  }),
)
export const prepareContextBlock = () =>
  ContextComposition.prepareBlock({
    init: () => ({ model: ContextModel.make({ value: '' }) }),
    update: contextUpdate,
    operations: {
      setRequired: (value: string, required: RequiredContext) => [
        ContextMessage.UpdatedValue({ value }),
        required,
      ],
      setAll: (
        value: string,
        required: RequiredContext,
        maybeCount: number | undefined,
        label: string | undefined,
        ...flags: ReadonlyArray<boolean>
      ) => [
        ContextMessage.UpdatedValue({ value }),
        required,
        maybeCount,
        label,
        ...flags,
      ],
    },
  })

export const RawContextBlock: CompletedAssembly<typeof prepareContextBlock> =
  Block.assemble(prepareContextBlock)
export const ContextBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ContextComposition.Model,
  typeof prepareContextBlock
> = Block.assemble(prepareContextBlock)

export const ParentModel = Schema.Struct({
  child: ChildModel,
  entries: Schema.Array(
    Schema.Struct({ id: Schema.String, child: ChildModel }),
  ),
})
export type ParentModel = typeof ParentModel.Type
export const ParentMessage = defineMessageUnion({
  RequestedNoop: {},
  RequestedSetChild: { value: Schema.String },
  RequestedSetEntry: { id: Schema.String, value: Schema.String },
})
export type ParentMessage = typeof ParentMessage.Type
// oxlint-disable-next-line foldkit/block-name-matches-variable -- This fixture deliberately uses a distinct literal Block identity for type coverage.
export const ParentDefinition = Block.makeDefinition(
  'ExposeMessageProofParent',
  {
    Model: ParentModel,
    Message: ParentMessage,
  },
)
export const ChildBinding = ParentDefinition.makeBinding(ChildBlock, {
  field: 'child',
}).withOutMessagePolicy({
  fold: ChildOutMessage.match<Update.Step<ParentModel, ParentMessage>>({
    ChangedValue: () => model => ({ model }),
  }),
})
export const EntryBinding = ParentDefinition.makeBinding(ChildBlock, {
  placement: 'entries',
  field: 'entries',
  key: 'id',
  childField: 'child',
}).withOutMessagePolicy({
  fold: (_id, outMessage) =>
    ChildOutMessage.match<Update.Step<ParentModel, ParentMessage>>(outMessage, {
      ChangedValue: () => model => ({ model }),
    }),
})

// oxlint-disable-next-line foldkit/block-name-matches-variable -- This fixture deliberately uses a distinct literal Block identity for type coverage.
export const ParentComposition = ParentDefinition.makeComposition({
  bindings: [ChildBinding, EntryBinding],
})
export const parentUpdate = ParentComposition.makeUpdate({
  RequestedNoop: model => ParentDefinition.makeNoopStep()(model),
  RequestedSetChild: (model, { value }) => ChildBinding.setValue(value)(model),
  RequestedSetEntry: (model, { id, value }) =>
    EntryBinding.setValue(id, value)(model),
})

export const prepareParentBlock = () =>
  ParentComposition.prepareBlock({
    init: ParentComposition.makeInit(() => ({
      model: { entries: [{ id: 'first', child: { value: 'entry' } }] },
    })),
    update: parentUpdate,
    operations: {
      setChild: (value: string) => [ParentMessage.RequestedSetChild({ value })],
      setEntry: (id: string, value: string) => [
        ParentMessage.RequestedSetEntry({ id, value }),
      ],
    },
    EffectsLayer: Layer.empty,
  })

export const RawParentBlock: CompletedAssembly<typeof prepareParentBlock> =
  Block.assemble(prepareParentBlock)
export const ParentBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ParentComposition.Model,
  typeof prepareParentBlock
> = Block.assemble(prepareParentBlock)

export function makeChoice<
  const Values extends readonly [string, ...Array<string>],
>(values: Values) {
  const Value = Schema.Literals(values)
  const Model = Schema.Struct({ selected: Value })
  const Message = defineMessageUnion({
    UpdatedValue: { value: Value },
    CompletedObserve: {},
  })
  // oxlint-disable-next-line foldkit/block-name-matches-variable -- This fixture deliberately uses a distinct literal Block identity for type coverage.
  const ChoiceOwnerNamespace = Block.makeNamespace('ExposeMessageProofChoice')
  const Observe = ChoiceOwnerNamespace.makeMount('Observe', {
    messages: [Message.CompletedObserve],
  })
  // oxlint-disable-next-line foldkit/block-name-matches-variable -- This fixture deliberately uses a distinct literal Block identity for type coverage.

  // oxlint-disable-next-line foldkit/block-name-matches-variable -- This fixture deliberately uses a distinct literal Block identity for type coverage.
  const Composition = ChoiceOwnerNamespace.makeDefinition({
    Model,
    Message,
  }).makeComposition({ mounts: [Observe] })
  const view = Composition.makeView.withInputs<Readonly<{ label: string }>>(
    (model, { label }, h) =>
      h.button(
        [h.OnMount(Observe())],
        [`${label}: ${globalThis.String(model.selected)}`],
      ),
  )
  const update = Composition.makeUpdate.withContext(
    (_required: RequiredContext) => ({
      UpdatedValue: (model, { value }) => ({
        model: modifyFields(model, { selected: () => value }),
      }),
      CompletedObserve: model => ({ model }),
    }),
  )
  const select = (value: Values[number], required: RequiredContext) =>
    Tuple.make(Message.UpdatedValue({ value }), required)

  const prepareBlock = () =>
    Composition.prepareBlock({
      init: (selected: Values[number]) => ({ model: Model.make({ selected }) }),
      update,
      view,
      operations: { select },
      EffectsLayer: Layer.empty,
      hostHandlers: [Observe],
    })

  const rawBlock: CompletedAssembly<typeof prepareBlock> =
    Block.assemble(prepareBlock)
  const block: Block.FromAssemblyWithView<
    typeof Composition.Model,
    typeof prepareBlock
  > = Block.assemble(prepareBlock)
  const provided = block.provideHandlers(
    Observe.toLayer(
      Effect.succeed(() => Effect.succeed(Message.CompletedObserve())),
    ),
  )

  return { block, rawBlock, provided, Observe }
}

export const FruitChoiceResult = makeChoice(['Apple', 'Pear'])
export const FruitChoice = FruitChoiceResult.block
export const ProvidedFruitChoice = FruitChoiceResult.provided

export const MountedChoiceModel = Schema.Struct({ selected: Schema.String })
export const MountedChoiceMessage = defineMessageUnion({
  UpdatedSelection: { value: Schema.String },
  CompletedObserveSelection: {},
})
export const MountedChoiceDefinition = Block.makeDefinition('MountedChoice', {
  Model: MountedChoiceModel,
  Message: MountedChoiceMessage,
})
export const ObserveSelection = MountedChoiceDefinition.makeMount(
  'ObserveSelection',
  {
    messages: [MountedChoiceMessage.CompletedObserveSelection],
    handler: function* () {
      return () =>
        Effect.succeed(MountedChoiceMessage.CompletedObserveSelection())
    },
  },
)
export const MountedChoiceComposition = MountedChoiceDefinition.makeComposition(
  { mounts: [ObserveSelection] },
)
export const mountedChoiceView = MountedChoiceComposition.makeView((model, h) =>
  h.button([h.OnMount(ObserveSelection())], [model.selected]),
)
export const mountedChoiceUpdate = MountedChoiceComposition.makeUpdate({
  UpdatedSelection: (model, { value }) => ({
    model: modifyFields(model, { selected: () => value }),
  }),
  CompletedObserveSelection: model => ({ model }),
})
export const prepareMountedChoiceBlock = () =>
  MountedChoiceComposition.prepareBlock({
    init: (selected: string) => ({
      model: MountedChoiceModel.make({ selected }),
    }),
    update: mountedChoiceUpdate,
    view: mountedChoiceView,
    operations: {
      select: (value: string) =>
        Tuple.make(MountedChoiceMessage.UpdatedSelection({ value })),
    },
    EffectsLayer: ObserveSelection.layer,
  })

export const RawMountedChoiceBlock: CompletedAssembly<
  typeof prepareMountedChoiceBlock
> = Block.assemble(prepareMountedChoiceBlock)
export const MountedChoiceBlock: Block.FromAssemblyWithView<
  typeof MountedChoiceComposition.Model,
  typeof prepareMountedChoiceBlock
> = Block.assemble(prepareMountedChoiceBlock)
export const prepareManagedMountedChoiceBlock = () =>
  MountedChoiceComposition.prepareBlock({
    init: (selected: string) => ({
      model: MountedChoiceModel.make({ selected }),
    }),
    update: mountedChoiceUpdate,
    view: mountedChoiceView,
    managedResources: {},
    operations: {
      select: (value: string) =>
        Tuple.make(MountedChoiceMessage.UpdatedSelection({ value })),
    },
    EffectsLayer: ObserveSelection.layer,
  })

export const RawManagedMountedChoiceBlock: CompletedAssembly<
  typeof prepareManagedMountedChoiceBlock
> = Block.assemble(prepareManagedMountedChoiceBlock)
export const ManagedMountedChoiceBlock: Block.FromAssemblyWithView<
  typeof MountedChoiceComposition.Model,
  typeof prepareManagedMountedChoiceBlock
> = Block.assemble(prepareManagedMountedChoiceBlock)

export const ExactModel = Schema.Struct({ value: Schema.String })
export const ExactMessage = defineMessageUnion({ RequestedPing: {} })
// oxlint-disable-next-line foldkit/block-name-matches-variable -- This fixture deliberately uses a distinct literal Block identity for type coverage.
export const ExactDefinition = Block.makeDefinition('ExposeMessageProofExact', {
  Model: ExactModel,
  Message: ExactMessage,
})
export function exactUpdate(
  model: typeof ExactModel.Type,
  _message: typeof ExactMessage.Type,
): Readonly<{ model: typeof ExactModel.Type; audit: 'exact' }> {
  return { model, audit: 'exact' }
}
// oxlint-disable-next-line foldkit/block-name-matches-variable -- This fixture deliberately uses a distinct literal Block identity for type coverage.
export const ExactComposition = ExactDefinition.makeComposition()
export const prepareExactBlock = () =>
  ExactComposition.prepareBlock({
    init: () => ({ model: ExactModel.make({ value: '' }) }),
    update: exactUpdate,
    operations: {
      ping: () => [ExactMessage.RequestedPing()],
      pingWithMetadata: () =>
        Object.assign(Tuple.make(ExactMessage.RequestedPing()), {
          model: 'TupleMetadata',
        }),
    },
    EffectsLayer: Layer.empty,
  })

export const RawExactBlock: CompletedAssembly<typeof prepareExactBlock> =
  Block.assemble(prepareExactBlock)
export const ExactBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ExactComposition.Model,
  typeof prepareExactBlock
> = Block.assemble(prepareExactBlock)

type SetValueArguments = Expect<
  Equal<Parameters<typeof ChildBinding.setValue>, [value: string]>
>
type KeyedSetValueArguments = Expect<
  Equal<Parameters<typeof EntryBinding.setValue>, [key: string, value: string]>
>
type RequiredArguments = Expect<
  Equal<
    Parameters<typeof ContextBlock.operations.setRequired>,
    [model: typeof ContextModel.Type, value: string, required: RequiredContext]
  >
>
type AllContextArguments = Expect<
  Equal<
    Parameters<typeof ContextBlock.operations.setAll>,
    [
      model: typeof ContextModel.Type,
      value: string,
      required: RequiredContext,
      maybeCount: number | undefined,
      label: string | undefined,
      ...flags: ReadonlyArray<boolean>,
    ]
  >
>
type GenericArguments = Expect<
  Equal<
    Parameters<typeof FruitChoice.operations.select>,
    [
      model: typeof FruitChoice.Model.Type,
      value: 'Apple' | 'Pear',
      required: RequiredContext,
    ]
  >
>
type GenericHostHandlersRemain = Expect<
  Equal<
    typeof FruitChoice.hostHandlers,
    readonly [typeof FruitChoiceResult.Observe]
  >
>
type GenericMountsRemain = Expect<
  typeof FruitChoice.mounts extends ReadonlyArray<Mount.LayeredMountDefinition>
    ? true
    : false
>
type ProvidedHostHandlersAreEmpty = Expect<
  Equal<typeof ProvidedFruitChoice.hostHandlers, readonly []>
>
type ProvidedGenericArguments = Expect<
  Equal<
    Parameters<typeof ProvidedFruitChoice.operations.select>,
    Parameters<typeof FruitChoice.operations.select>
  >
>
type CommandRequirementsRemain = Expect<
  Equal<
    Update.RequirementsOf<typeof ChildBlock.operations.setValue>,
    Command.HandlerOf<typeof RecordValue>
  >
>
type ExposedOutMessage =
  ReturnType<
    typeof ChildBlock.operations.setValue
  > extends Update.ReturnWithOutMessage<
    ChildModel,
    ChildMessage,
    infer OutMessage,
    // oxlint-disable-next-line typescript/no-explicit-any -- This fixture deliberately probes erased any channels or detects any in an inferred public type.
    any
  >
    ? OutMessage
    : never
type OutMessageRemains = Expect<Equal<ExposedOutMessage, ChildOutMessage>>
type ExactReturnRemains = Expect<
  Equal<
    ReturnType<typeof ExactBlock.operations.ping>,
    ReturnType<typeof exactUpdate>
  >
>

type TupleMetadataStillReceivesModel = Expect<
  Equal<
    Parameters<typeof ExactBlock.operations.pingWithMetadata>,
    [model: typeof ExactModel.Type]
  >
>
type TupleMetadataPreservesReturn = Expect<
  Equal<
    ReturnType<typeof ExactBlock.operations.pingWithMetadata>,
    ReturnType<typeof exactUpdate>
  >
>
export type TupleMetadataAssertions = [
  SetValueArguments,
  KeyedSetValueArguments,
  RequiredArguments,
  AllContextArguments,
  GenericArguments,
  GenericHostHandlersRemain,
  GenericMountsRemain,
  ProvidedHostHandlersAreEmpty,
  ProvidedGenericArguments,
  CommandRequirementsRemain,
  OutMessageRemains,
  ExactReturnRemains,
  TupleMetadataStillReceivesModel,
  TupleMetadataPreservesReturn,
]

type CompletedAssembly<Producer extends () => Block.AssemblyDraft<object>> =
  ReturnType<Producer> extends Block.AssemblyDraft<infer Completed>
    ? Completed
    : never
