import { Array, Context, Effect, Layer, Option, Schema } from 'effect'
import { Block, Message, Struct, Update } from 'foldkit'

import type { Assert, Equal } from './from-assembly.assertions.js'

export const ChildId = Schema.String.pipe(
  Schema.brand('BindingRelationshipsChildId'),
)
export type ChildId = typeof ChildId.Type
export const ChildModel = Schema.Struct({
  id: ChildId,
  label: Schema.String,
})
export type ChildModel = typeof ChildModel.Type
export const ChildMessage = Message.defineMessageUnion({
  RequestedRead: {},
  CompletedRead: { label: Schema.String },
  UpdatedLabel: { label: Schema.String },
})
export type ChildMessage = typeof ChildMessage.Type
export const HandlerUnavailable = Schema.TaggedStruct(
  'BindingRelationshipsHandlerUnavailable',
  {},
)
export type HandlerUnavailable = typeof HandlerUnavailable.Type

export class ChildStore extends Context.Service<
  ChildStore,
  Readonly<{ read: Effect.Effect<string> }>
>()('BindingRelationships/ChildStore') {}

const childConstruction: Effect.Effect<void, HandlerUnavailable> = Effect.void

export const ChildKey = Symbol('BindingRelationshipsChild')
export const ChildBlock = Block.make('BindingRelationshipsChild', {
  key: ChildKey,
  Model: ChildModel,
  Message: ChildMessage,
  InitArgs: Schema.Tuple([ChildId, Schema.String]),
  effects: { services: [ChildStore], Error: HandlerUnavailable },
  operations: {
    requestRead: ChildMessage.RequestedRead,
    updateLabel: ChildMessage.UpdatedLabel,
  },
})

export const ContextChildKey = Symbol('BindingRelationshipsContextChild')
export const ContextChildBlock = Block.make(
  'BindingRelationshipsContextChild',
  {
    key: ContextChildKey,
    Model: ChildModel,
    Message: ChildMessage,
    InitArgs: Schema.Tuple([ChildId, Schema.String]),
    Context: Schema.Tuple([Schema.Struct({ prefix: Schema.String })]),
    operations: {
      updateLabel: ChildMessage.UpdatedLabel,
    },
  },
)
export const Read = ChildBlock.makeCommand('Read', {
  messages: [ChildMessage.CompletedRead],
  handler: function* () {
    const store = yield* ChildStore
    yield* childConstruction

    return () =>
      Effect.map(store.read, label => ChildMessage.CompletedRead({ label }))
  },
})
const ChildComposition = ChildBlock.makeComposition()
export const childLayer = ChildBlock.makeLayer(
  Effect.succeed({
    children: [],
    init: ChildComposition.makeInit((id, label) => ({
      model: ChildModel.make({ id, label }),
    })),
    update: ChildComposition.makeUpdate({
      RequestedRead: model => ({ model, commands: [Read()] }),
      CompletedRead: (model, { label }) => ({
        model: Struct.modifyFields(model, { label: () => label }),
      }),
      UpdatedLabel: (model, { label }) => ({
        model: Struct.modifyFields(model, { label: () => label }),
      }),
    }),
    EffectsLayer: Read.layer,
  }),
)

export const OptionModel = Schema.Option(Schema.String)
export const OptionModelKey = Symbol('BindingRelationshipsOptionModel')
export const OptionModelBlock = Block.make('BindingRelationshipsOptionModel', {
  key: OptionModelKey,
  Model: OptionModel,
  Message: Schema.Never,
  InitArgs: Schema.Tuple([]),
})

export const ArrayModel = Schema.Array(Schema.String)
export const ArrayModelKey = Symbol('BindingRelationshipsArrayModel')
export const ArrayModelBlock = Block.make('BindingRelationshipsArrayModel', {
  key: ArrayModelKey,
  Model: ArrayModel,
  Message: Schema.Never,
  InitArgs: Schema.Tuple([]),
})

export const OptionalChild = Schema.Struct({
  id: ChildId,
  child: ChildModel,
})
export type OptionalChild = typeof OptionalChild.Type
export const WrappedChild = Schema.Struct({
  id: ChildId,
  child: ChildModel,
  note: Schema.String,
})
export type WrappedChild = typeof WrappedChild.Type
export const ParentModel = Schema.Struct({
  isActive: Schema.Boolean,
  requiredChild: ChildModel,
  maybeChild: Schema.Option(ChildModel),
  maybeKeyedChild: Schema.Option(OptionalChild),
  children: Schema.Array(ChildModel),
  wrappedChildren: Schema.Array(WrappedChild),
  childrenById: Schema.Record(ChildId, ChildModel),
  childrenByNumber: Schema.HashMap(Schema.Int, ChildModel),
  maybeCustomChild: Schema.Option(ChildModel),
  customChildren: Schema.Array(WrappedChild),
  optionModelChild: OptionModel,
  arrayModelChild: ArrayModel,
})
export type ParentModel = typeof ParentModel.Type
export const ParentMessage = Message.defineMessageUnion({
  ClickedParent: {},
})
export const ParentChildInitContext = Schema.Struct({ seed: Schema.Number })
export const ParentKey = Symbol('BindingRelationshipsParent')
export const ParentBlock = Block.make('BindingRelationshipsParent', {
  key: ParentKey,
  Model: ParentModel,
  Message: ParentMessage,
  InitArgs: Schema.Tuple([]),
  ChildInitContext: ParentChildInitContext,
})

export const {
  makeCustomBinding,
  makeCustomKeyedBinding: makeDetachedCustomKeyedBinding,
  makeHashMapBinding,
  makeKeyedArrayBinding,
  makeOptionalFieldBinding,
  makeOptionalKeyedFieldBinding,
  makeRecordBinding: makeDetachedRecordBinding,
  makeRequiredFieldBinding: makeDetachedRequiredBinding,
} = ParentBlock

export const RequiredChildBinding = makeDetachedRequiredBinding(ChildBlock, {
  field: 'requiredChild',
  activeWhen: model => model.isActive,
  init: {
    contextToArgs: ({ seed }) => [ChildId.make('required'), `required-${seed}`],
  },
})
export const OptionalChildBinding = makeOptionalFieldBinding(ChildBlock, {
  field: 'maybeChild',
  init: {
    contextToArgs: ({ seed }) =>
      seed > 0
        ? Option.some([ChildId.make('optional'), `optional-${seed}`])
        : Option.none(),
  },
})
export const OptionalKeyedChildBinding = makeOptionalKeyedFieldBinding(
  ChildBlock,
  {
    field: 'maybeKeyedChild',
    key: 'id',
    childField: 'child',
    placement: 'optionalKeyedChild',
  },
)
export const ChildrenBinding = makeKeyedArrayBinding(ChildBlock, {
  field: 'children',
  key: 'id',
  placement: 'children',
  init: {
    instances: ({ seed }) => [
      {
        key: ChildId.make('first'),
        args: [ChildId.make('first'), `first-${seed}`],
      },
    ],
  },
})
export const WrappedChildrenBinding = makeKeyedArrayBinding(ChildBlock, {
  field: 'wrappedChildren',
  key: 'id',
  childField: 'child',
  placement: 'wrappedChildren',
  init: {
    instances: ({ seed }) => [
      {
        key: ChildId.make('wrapped'),
        args: [ChildId.make('wrapped'), `wrapped-${seed}`],
      },
    ],
    toItem: ({ key }, child) =>
      WrappedChild.make({ id: key, child, note: 'initialized' }),
  },
})
export const ChildrenByIdBinding = makeDetachedRecordBinding(ChildBlock, {
  field: 'childrenById',
})
export const ChildrenByNumberBinding = makeHashMapBinding(ChildBlock, {
  field: 'childrenByNumber',
})
export const CustomChildBinding = makeCustomBinding(ChildBlock, {
  placement: 'customChild',
  read: model => model.maybeCustomChild,
  write: (model, nextChild) =>
    Struct.modifyFields(model, {
      maybeCustomChild: () => Option.some(nextChild),
    }),
})
export const CustomChildrenBinding = makeDetachedCustomKeyedBinding(
  ChildBlock,
  {
    placement: 'customChildren',
    readAll: model => model.customChildren,
    key: entry => entry.id,
    keySchema: ChildId,
    read: entry => entry.child,
    writeAt: (model, id, nextChild) =>
      Struct.modifyFields(model, {
        customChildren: Array.map(entry =>
          entry.id === id
            ? WrappedChild.make({
                id: entry.id,
                child: nextChild,
                note: entry.note,
              })
            : entry,
        ),
      }),
  },
)
export const ContextCustomChildrenBinding = makeDetachedCustomKeyedBinding(
  ContextChildBlock,
  {
    placement: 'contextCustomChildren',
    readAll: model => model.customChildren,
    key: entry => entry.id,
    keySchema: ChildId,
    read: entry => entry.child,
    writeAt: model => model,
    delivery: {
      toUpdateContext: () => [{ prefix: 'routed' }],
    },
  },
)
export const RequiredOptionModelBinding = makeDetachedRequiredBinding(
  OptionModelBlock,
  { field: 'optionModelChild' },
)
export const RequiredArrayModelBinding = makeDetachedRequiredBinding(
  ArrayModelBlock,
  { field: 'arrayModelChild' },
)

export const ParentComposition = ParentBlock.makeComposition({
  bindings: [
    RequiredChildBinding,
    OptionalChildBinding,
    OptionalKeyedChildBinding,
    ChildrenBinding,
    WrappedChildrenBinding,
    ChildrenByIdBinding,
    ChildrenByNumberBinding,
    CustomChildBinding,
    CustomChildrenBinding,
    RequiredOptionModelBinding,
    RequiredArrayModelBinding,
  ],
})

export const ServiceParentModel = Schema.Struct({ child: ChildModel })
export const ServiceParentChildInitContext = Schema.Struct({
  id: ChildId,
  label: Schema.String,
})
export const ServiceParentKey = Symbol('BindingRelationshipsServiceParent')
export const ServiceParentBlock = Block.make(
  'BindingRelationshipsServiceParent',
  {
    key: ServiceParentKey,
    Model: ServiceParentModel,
    Message: Schema.Never,
    InitArgs: Schema.Tuple([]),
    ChildInitContext: ServiceParentChildInitContext,
    effects: { services: [ChildStore], Error: HandlerUnavailable },
  },
)
export const ServiceChildBinding = ServiceParentBlock.makeRequiredFieldBinding(
  ChildBlock,
  {
    field: 'child',
    placement: 'serviceChild',
    init: {
      contextToArgs: ({ id, label }) => [id, label],
    },
  },
)
export const ServiceParentComposition = ServiceParentBlock.makeComposition({
  bindings: [ServiceChildBinding],
})
export const serviceParentInit = ServiceParentComposition.makeInit(() => ({
  childInitContext: ServiceParentChildInitContext.make({
    id: ChildId.make('service'),
    label: 'initial',
  }),
  model: {},
  steps: [ServiceChildBinding.requestRead()],
}))
export const serviceParentLayer = ServiceParentBlock.makeLayer(
  Effect.gen(function* () {
    const child = yield* ServiceChildBinding

    return {
      children: [child],
      init: serviceParentInit,
      update: ServiceParentComposition.makeUpdate({}),
    }
  }),
).pipe(Layer.provide(childLayer))

type ChildOwner = Block.Owner<
  Block.NominalId<'BindingRelationshipsChild', typeof ChildKey>,
  true
>
type FactsFromGraph<GraphValue> =
  GraphValue extends Block.ContractGraph<
    infer _OwnerValue,
    infer _ModelSchema,
    infer _MessageSchema,
    infer _OutMessageSchema,
    infer Facts
  >
    ? Facts
    : never
type ServiceParentLayerFacts = FactsFromGraph<
  Layer.Success<typeof serviceParentLayer>
>
export type ExactServiceChildRequestRequirements = Assert<
  Equal<
    Update.RequirementsOf<ReturnType<typeof ServiceChildBinding.requestRead>>,
    | Block.InternalExecution<ChildOwner>
    | Block.Scoped<'serviceChild', Block.RuntimeCapability<ChildOwner>>
  >
>
export type ExactDeclaredServiceParentServices = Assert<
  Equal<
    Block.FactsOf<typeof ServiceParentBlock>['effectsLayerRequirements'],
    ChildStore
  >
>
export type ExactDeclaredServiceParentError = Assert<
  Equal<
    Block.FactsOf<typeof ServiceParentBlock>['effectsLayerError'],
    HandlerUnavailable
  >
>
export type ExactCompletedServiceParentServices = Assert<
  Equal<ServiceParentLayerFacts['effectsLayerRequirements'], ChildStore>
>
export type ExactCompletedServiceParentError = Assert<
  Equal<ServiceParentLayerFacts['effectsLayerError'], HandlerUnavailable>
>
export type ExactCompletedServiceParentProgramRequirements = Assert<
  Equal<ServiceParentLayerFacts['programRequirements'], ChildStore>
>

export const VariantChildModel = Schema.TaggedStruct('Child', {
  value: Schema.Number,
})
export const EmptyModel = Schema.TaggedStruct('Empty', {})
export const VariantParentModel = Schema.Union([VariantChildModel, EmptyModel])
export const VariantChildKey = Symbol('BindingRelationshipsVariantChild')
export const VariantChildBlock = Block.make(
  'BindingRelationshipsVariantChild',
  {
    key: VariantChildKey,
    Model: VariantChildModel,
    Message: Schema.Never,
    InitArgs: Schema.Tuple([]),
  },
)
export const VariantParentKey = Symbol('BindingRelationshipsVariantParent')
export const VariantParentBlock = Block.make(
  'BindingRelationshipsVariantParent',
  {
    key: VariantParentKey,
    Model: VariantParentModel,
    Message: Schema.Never,
    InitArgs: Schema.Tuple([]),
  },
)
export const { makeVariantBinding } = VariantParentBlock
export const VariantBinding = makeVariantBinding(VariantChildBlock)
export const VariantComposition = VariantParentBlock.makeComposition({
  bindings: [VariantBinding],
})

export const ReportingOutMessage = Message.defineMessageUnion({
  Selected: { label: Schema.String },
})
export const ReportingKey = Symbol('BindingRelationshipsReporting')
export const ReportingBlock = Block.make('BindingRelationshipsReporting', {
  key: ReportingKey,
  Model: ChildModel,
  Message: ChildMessage,
  OutMessage: ReportingOutMessage,
  InitArgs: Schema.Tuple([ChildId, Schema.String]),
})
export const ReportingParentModel = Schema.Struct({ child: ChildModel })
export const ReportingParentOutMessage = Message.defineMessageUnion({
  SelectedChild: { label: Schema.String },
})
export const ReportingParentKey = Symbol('BindingRelationshipsReportingParent')
export const ReportingParentBlock = Block.make(
  'BindingRelationshipsReportingParent',
  {
    key: ReportingParentKey,
    Model: ReportingParentModel,
    Message: ParentMessage,
    OutMessage: ReportingParentOutMessage,
    InitArgs: Schema.Tuple([]),
  },
)
const ReportingBindingBase = ReportingParentBlock.makeRequiredFieldBinding(
  ReportingBlock,
  {
    field: 'child',
    init: false,
  },
)
export const ReportingBinding = ReportingBindingBase.withOutMessagePolicy({
  fold: ReportingParentBlock.makeOutMessageFold(ReportingBlock, {
    Selected: ({ label }) =>
      ReportingParentBlock.makeOutMessageStep(() =>
        ReportingParentOutMessage.SelectedChild({ label }),
      ),
  }),
})

export type ExactOptionalKey = Assert<
  Equal<Parameters<typeof OptionalKeyedChildBinding.fold>[1], ChildId>
>
export type ExactRecordKey = Assert<
  Equal<Parameters<typeof ChildrenByIdBinding.fold>[1], ChildId>
>
export type ExactHashMapKey = Assert<
  Equal<Parameters<typeof ChildrenByNumberBinding.fold>[1], number>
>
export type ExactCustomKey = Assert<
  Equal<Parameters<typeof CustomChildrenBinding.fold>[1], ChildId>
>
export type ExactInitArguments = Assert<
  Equal<
    Parameters<typeof ChildrenByIdBinding.init>[0]['args'],
    [id: ChildId, label: string]
  >
>
export type ExactRegistration = Assert<
  Equal<
    Update.RegistrationEvidenceOf<ReturnType<typeof ChildrenByIdBinding.fold>>,
    Block.RequirementOfBinding<typeof ChildrenByIdBinding>
  >
>
export const requestFirstRead = ChildrenByIdBinding.requestRead(
  ChildId.make('first'),
)
