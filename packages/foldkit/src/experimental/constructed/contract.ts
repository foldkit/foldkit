import type { Effect, Layer, Schema, Scope, Stream } from 'effect'

import type {
  CompletionContractProof,
  CompletionProof,
} from '../../block/assemblyState.js'
import type { ExecutableHandle } from '../../block/bindingConnection.js'
import type {
  DefaultViewOf,
  DefaultViewTypeId,
} from '../../block/defaultView.js'
import type {
  AnyBlock,
  LocalEffectsLayerTypeId,
} from '../../block/definition.js'
import type {
  LocalMountsTypeId,
  PublicMountRequirementsTypeId,
} from '../../block/identity.js'
import type { LayerOutputs } from '../../block/layerOutputs.js'
import type { OperationEmission } from '../../block/operationEmission.js'
import type {
  OperationOutputOf,
  OperationOutputs,
} from '../../block/operationOutputs.js'
import type { Owner } from '../../block/owner.js'
import type {
  PrivateDelivery,
  PrivateEncodedDelivery,
} from '../../block/privateDelivery.js'
import type {
  HandlerEvidenceOfBlock,
  PublicRuntimeServicesTypeId,
  RequirementsOfBlock,
  RuntimeServicesOfBlock,
  SubscriptionRequirementsEvidence,
} from '../../block/requirements.js'
import type { BlockView, Document, DocumentView } from '../../html/index.js'
import type * as Mount from '../../mount/index.js'
import type { LayeredRootTypeId } from '../../runtime/rootBlock.js'
import type { Subscription } from '../../subscription/subscription.js'
import type * as Update from '../../update/index.js'
import type { InputOperationName } from '../contracted/inMessageUpdate.js'

export type {
  PrivateDelivery,
  PrivateEncodedDelivery,
} from '../../block/privateDelivery.js'

type AnyFunction = (...args: ReadonlyArray<any>) => any
type ReturnOf<Operation> = Operation extends (
  ...args: ReadonlyArray<never>
) => infer Output
  ? Output
  : never
type AnySchema = Schema.Codec<any, any, any, any>
type AnySelfContainedSchema = Schema.Codec<any, any, never, never>
/** @internal Only outputs supplied by every possible provider satisfy a dependency. */
export type GuaranteedLayerOutputs<Dependencies extends Layer.Any> =
  LayerOutputs<Dependencies>
type Tail<Args extends ReadonlyArray<unknown>> = Args extends readonly [
  unknown,
  ...infer Rest,
]
  ? Rest
  : readonly []
type OutOf<Output> =
  Output extends Readonly<{ outMessage?: infer Out }>
    ? Exclude<Out, undefined>
    : never

/** Identifies a passive constructor descriptor, distinct from a completed Block. */
export const DescriptorTypeId = Symbol('foldkit/ConstructedBlock/Descriptor')

declare const InternalExecutionTypeId: unique symbol
declare const GraphTypeId: unique symbol
/** @internal Supplies constructor typing for a unified Block declaration. */
export declare const DeclaredBlockReaderTypeId: unique symbol
declare const ImplementationSubscriptionsTypeId: unique symbol

/** Identifies a Layer-owned executable graph without exposing its Context key. */
export interface Graph<
  OwnerValue,
  ModelSchema,
  MessageSchema,
  OutMessageSchema,
  Facts extends PublicFacts = PublicFacts,
> {
  readonly [GraphTypeId]: readonly [
    OwnerValue,
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    Facts,
  ]
}

/** A checked descriptor whose private executable is constructed by an ordinary Layer. */
export interface LayeredDescriptor<
  OwnerValue extends Owner<string>,
  ModelSchema extends AnySchema,
  LocalMessageSchema extends AnySchema,
  OutMessageSchema extends AnySchema | undefined,
  Facts extends PublicFacts,
  ConstructorError,
  ConstructorRequirements,
> {
  readonly [LayeredRootTypeId]: Readonly<{
    contract: CoreContractFromFacts<
      OwnerValue,
      ModelSchema,
      LocalMessageSchema,
      OutMessageSchema,
      Facts
    >
    requirements: Facts['programRequirements']
    runtimeServices: Facts['runtimeServices']
  }>
  readonly [DescriptorTypeId]: Facts
  readonly owner: OwnerValue
  readonly Model: ModelSchema
  readonly Message: LocalMessageSchema
  readonly OutMessage: OutMessageSchema
  readonly layer: Layer.Layer<
    Graph<OwnerValue, ModelSchema, LocalMessageSchema, OutMessageSchema, Facts>,
    ConstructorError,
    Exclude<ConstructorRequirements, Scope.Scope | Layer.CurrentMemoMap>
  >
  readonly get: Effect.Effect<
    Executable<
      OwnerValue,
      ModelSchema,
      LocalMessageSchema,
      OutMessageSchema,
      Facts
    >,
    never,
    Graph<OwnerValue, ModelSchema, LocalMessageSchema, OutMessageSchema, Facts>
  >
  /** Supplies graph-construction Services under the graph Layer's resource lifetime.
   * Returns a new passive descriptor with canonical Schemas and an isolated
   * construction subtree. Repeated use of that descriptor shares its implementation.
   */
  provide<const Dependencies extends Layer.Any>(
    dependencies: Dependencies,
  ): LayeredDescriptor<
    OwnerValue,
    ModelSchema,
    LocalMessageSchema,
    OutMessageSchema,
    Facts,
    ConstructorError | Layer.Error<Dependencies>,
    | Exclude<ConstructorRequirements, GuaranteedLayerOutputs<Dependencies>>
    | Layer.Services<Dependencies>
  >
}

/** A private execution capability supplied by one acquired executable's Layer. */
export interface InternalExecution<OwnerValue> {
  readonly [InternalExecutionTypeId]: OwnerValue
}

/** Exact result channels without a retained handler implementation. */
export interface ResultContract<OutMessage, Requirements> {
  readonly outMessage: OutMessage
  readonly requirements: Requirements
}

/** Public operation arguments and result channels inferred during completion. */
export interface OperationContract<
  Args extends ReadonlyArray<unknown>,
  OutMessage,
  Requirements,
> extends ResultContract<OutMessage, Requirements> {
  readonly args: Args
}

/** The public inputs and root kind of a completed default renderer. */
export interface ViewContract<Inputs, Kind extends 'Element' | 'Document'> {
  readonly inputs: Inputs
  readonly kind: Kind
}

/** Dependency, Message, and Service contracts of one registered Subscription. */
export interface SubscriptionContract<
  Dependencies,
  Messages extends ReadonlyArray<Schema.Top>,
  Requirements = unknown,
  ExecutionRequirements = Requirements,
> {
  readonly dependencies: Dependencies
  readonly messages: Messages
  readonly requirements: Requirements
  readonly executionRequirements: ExecutionRequirements
}

/** @internal Reconstructs Subscription contracts without retaining implementation members. */
export type SubscriptionsFromFacts<
  Model,
  Message,
  Entries extends Readonly<
    Record<string, SubscriptionContract<unknown, ReadonlyArray<Schema.Top>>>
  >,
  ExecutionCapability = never,
> = {
  readonly [Key in keyof Entries]: Subscription<
    Model,
    Message,
    Entries[Key]['dependencies'],
    [ExecutionCapability] extends [never]
      ? Entries[Key]['requirements']
      : Entries[Key]['executionRequirements'] | ExecutionCapability
  > &
    Readonly<{ messages: Entries[Key]['messages'] }> &
    ([ExecutionCapability] extends [never]
      ? unknown
      : SubscriptionRequirementsEvidence<Entries[Key]['requirements']>)
}

/** Public facts projected from a checked implementation before hiding its graph. */
export interface PublicFacts {
  readonly inMessage?:
    | Readonly<{
        Schema: AnySchema
        context: ReadonlyArray<unknown>
      }>
    | undefined
  readonly isMessageFree: boolean
  readonly initArgs: ReadonlyArray<unknown>
  readonly init: ResultContract<unknown, unknown>
  readonly updateContext: ReadonlyArray<unknown>
  readonly update: ResultContract<unknown, unknown>
  readonly updates: Readonly<
    Record<PropertyKey, ResultContract<unknown, unknown>>
  >
  readonly operations: Readonly<
    Record<string, OperationContract<ReadonlyArray<unknown>, unknown, unknown>>
  >
  readonly view: ViewContract<unknown, 'Element' | 'Document'> | undefined
  readonly subscriptions: Readonly<
    Record<string, SubscriptionContract<unknown, ReadonlyArray<Schema.Top>>>
  >
  readonly mountRequirements: unknown
  readonly effectsLayerRequirements: unknown
  readonly effectsLayerError: unknown
  readonly hostRequirements: unknown
  readonly programRequirements: unknown
  readonly runtimeServices: unknown
  readonly decodingServices: never
  readonly encodingServices: never
}

/** @internal Exact test registry belonging to one selected implementation. */
export interface ImplementationSubscriptions<
  Subscriptions extends PublicFacts['subscriptions'],
> {
  readonly [ImplementationSubscriptionsTypeId]: Subscriptions
}

/** @internal Selects implementation test evidence without widening its public contract. */
export type ImplementationSubscriptionsOf<Block> =
  Block extends ImplementationSubscriptions<infer Subscriptions>
    ? Subscriptions
    : FactsOf<Block> extends infer Facts extends PublicFacts
      ? Facts['subscriptions']
      : never

/** A passive declaration carrying canonical local Schemas and a constructor recipe. */
export interface Descriptor<
  OwnerValue extends Owner<string>,
  ModelSchema extends AnySchema,
  LocalMessageSchema extends AnySchema,
  OutMessageSchema extends AnySchema | undefined,
  Facts extends PublicFacts,
  ConstructorError,
  ConstructorRequirements,
> {
  readonly [DescriptorTypeId]: Facts
  readonly owner: OwnerValue
  readonly Model: ModelSchema
  readonly Message: LocalMessageSchema
  readonly OutMessage: OutMessageSchema
  readonly construct: () => Effect.Effect<
    Executable<
      OwnerValue,
      ModelSchema,
      LocalMessageSchema,
      OutMessageSchema,
      Facts
    >,
    ConstructorError,
    ConstructorRequirements
  >
}

type DispatchMessage<
  OwnerValue,
  LocalMessageSchema extends AnySchema,
  IsMessageFree extends boolean,
> = IsMessageFree extends true
  ? never
  : LocalMessageSchema['Type'] | PrivateDelivery<OwnerValue>

type LocalConstructors<Local> = {
  readonly [
    Key in keyof Local as 0 extends 1 & Local[Key]
      ? never
      : [Local[Key]] extends [never]
        ? never
        : Local[Key] extends Schema.Top & AnyFunction
          ? Key
          : never
  ]: Local[Key]
}

/** Full acquired dispatch Codec, with exact local constructors and private delivery. */
export type DispatchSchema<
  OwnerValue,
  LocalMessageSchema extends AnySchema,
  DecodingServices,
  EncodingServices,
  IsMessageFree extends boolean = false,
> = Schema.Codec<
  DispatchMessage<OwnerValue, LocalMessageSchema, IsMessageFree>,
  IsMessageFree extends true
    ? never
    : LocalMessageSchema['Encoded'] | PrivateEncodedDelivery<OwnerValue>,
  DecodingServices,
  EncodingServices
> &
  LocalConstructors<LocalMessageSchema> &
  Readonly<{
    Type: DispatchMessage<OwnerValue, LocalMessageSchema, IsMessageFree>
  }>

/** A completed pure result retaining exact Command requirements and no OutMessage. */
export interface ExecutableReturn<
  Model,
  Message,
  Requirements = never,
> extends Update.Return<Model, Message, Requirements> {}

/** A completed pure result retaining exact Command and OutMessage channels. */
export interface ExecutableReturnWithOutMessage<
  Model,
  Message,
  OutMessage,
  Requirements = never,
> extends Update.ReturnWithOutMessage<
  Model,
  Message,
  OutMessage,
  Requirements
> {}

type PublicResult<OwnerValue, Model, Message, Contract> =
  Contract extends ResultContract<infer OutMessage, infer Requirements>
    ? [OutMessage] extends [never]
      ? ExecutableReturn<
          Model,
          Message,
          Requirements | InternalExecution<OwnerValue>
        >
      : ExecutableReturnWithOutMessage<
          Model,
          Message,
          OutMessage,
          Requirements | InternalExecution<OwnerValue>
        >
    : never

type SelectedResult<SelectedMessage, Facts extends PublicFacts> =
  SelectedMessage extends Readonly<{ _tag: infer Tag extends PropertyKey }>
    ? Tag extends keyof Facts['updates']
      ? Facts['updates'][Tag]
      : Facts['update']
    : Facts['update']

/** Pure acquired update retaining direct and curried dispatch calls. */
export interface ExecutableUpdate<
  OwnerValue,
  Model,
  Message,
  Facts extends PublicFacts,
> extends OperationOutputs<
  {
    [
      Tag in keyof Facts['updates']
    ]: Facts['updates'][Tag] extends ResultContract<
      infer OutMessage,
      infer Requirements
    >
      ? readonly [
          tag: Tag,
          outMessage: OutMessage,
          requirements: Requirements | InternalExecution<OwnerValue>,
          registration: never,
        ]
      : never
  }[keyof Facts['updates']]
> {
  <SelectedMessage extends Message>(
    message: SelectedMessage,
  ): (
    model: Model,
    ...context: Facts['updateContext']
  ) => PublicResult<
    OwnerValue,
    Model,
    Message,
    SelectedResult<SelectedMessage, Facts>
  >
  <SelectedMessage extends Message>(
    model: Model,
    message: SelectedMessage,
    ...context: Facts['updateContext']
  ): PublicResult<
    OwnerValue,
    Model,
    Message,
    SelectedResult<SelectedMessage, Facts>
  >
}

type OperationFunction<OwnerValue, Model, Message, Contract> =
  Contract extends OperationContract<
    infer Args,
    infer OutMessage,
    infer Requirements
  >
    ? ((
        model: Model,
        ...args: Args
      ) => PublicResult<
        OwnerValue,
        Model,
        Message,
        ResultContract<OutMessage, Requirements>
      >) &
        OperationEmission<[OutMessage] extends [never] ? false : true>
    : never

type InputSchema<Facts> =
  Facts extends Readonly<{
    inMessage: Readonly<{ Schema: infer In extends AnySchema }>
  }>
    ? In
    : undefined

type InputValue<Facts> =
  InputSchema<Facts> extends infer In extends AnySchema ? In['Type'] : never

type InputContext<Facts> =
  Facts extends Readonly<{
    inMessage: Readonly<{
      context: infer Context extends ReadonlyArray<unknown>
    }>
  }>
    ? Context
    : readonly []

type InputResult<Facts extends PublicFacts, Input> =
  Input extends Readonly<{ _tag: infer Tag extends PropertyKey }>
    ? InputOperationName<Tag> extends keyof Facts['operations']
      ? Facts['operations'][InputOperationName<Tag>]
      : never
    : never

/** @internal Retains exact selected input channels independently of local update dispatch. */
export interface ExecutableInMessageUpdate<
  OwnerValue,
  Model,
  Message,
  Facts extends PublicFacts,
> {
  <Input extends InputValue<Facts>>(
    input: Input,
  ): (
    model: Model,
    ...context: InputContext<Facts>
  ) => PublicResult<OwnerValue, Model, Message, InputResult<Facts, Input>>
  <Input extends InputValue<Facts>>(
    model: Model,
    input: Input,
    ...context: InputContext<Facts>
  ): PublicResult<OwnerValue, Model, Message, InputResult<Facts, Input>>
}

type ExecutableOperations<
  OwnerValue,
  Model,
  Message,
  Facts extends PublicFacts,
> = {
  readonly [Name in keyof Facts['operations']]: OperationFunction<
    OwnerValue,
    Model,
    Message,
    Facts['operations'][Name]
  >
}

type ExecutableView<Model, Message, Contract> =
  Contract extends ViewContract<infer Inputs, infer Kind>
    ? Kind extends 'Document'
      ? DocumentView<Model, Message>
      : BlockView<Model, Message, Inputs>
    : never

interface ExecutableMembers<
  OwnerValue extends Owner<string>,
  ModelSchema extends AnySchema,
  LocalMessageSchema extends AnySchema,
  OutMessageSchema extends AnySchema | undefined,
  Facts extends PublicFacts,
> {
  readonly owner: OwnerValue
  readonly Model: ModelSchema
  readonly Message: DispatchSchema<
    OwnerValue,
    LocalMessageSchema,
    Facts['decodingServices'],
    Facts['encodingServices'],
    Facts['isMessageFree']
  >
  readonly OutMessage: OutMessageSchema
  readonly InMessage: InputSchema<Facts>
  readonly inMessageUpdate: Facts extends Readonly<{ inMessage: unknown }>
    ? ExecutableInMessageUpdate<
        OwnerValue,
        ModelSchema['Type'],
        DispatchMessage<OwnerValue, LocalMessageSchema, Facts['isMessageFree']>,
        Facts
      >
    : undefined
  readonly init: (
    ...args: Facts['initArgs']
  ) => PublicResult<
    OwnerValue,
    ModelSchema['Type'],
    DispatchMessage<OwnerValue, LocalMessageSchema, Facts['isMessageFree']>,
    Facts['init']
  >
  readonly update: ExecutableUpdate<
    OwnerValue,
    ModelSchema['Type'],
    DispatchMessage<OwnerValue, LocalMessageSchema, Facts['isMessageFree']>,
    Facts
  >
  readonly operations: ExecutableOperations<
    OwnerValue,
    ModelSchema['Type'],
    DispatchMessage<OwnerValue, LocalMessageSchema, Facts['isMessageFree']>,
    Facts
  >
  readonly EffectsLayer: Layer.Layer<
    InternalExecution<OwnerValue>,
    Facts['effectsLayerError'],
    Facts['effectsLayerRequirements'] | Facts['hostRequirements']
  >
  readonly [DefaultViewTypeId]: ExecutableView<
    ModelSchema['Type'],
    DispatchMessage<OwnerValue, LocalMessageSchema, Facts['isMessageFree']>,
    Facts['view']
  >
}

/** An acquired compact facade whose implementation graph remains private. */
export interface Executable<
  OwnerValue extends Owner<string>,
  ModelSchema extends AnySchema,
  LocalMessageSchema extends AnySchema,
  OutMessageSchema extends AnySchema | undefined,
  Facts extends PublicFacts,
>
  extends
    ExecutableMembers<
      OwnerValue,
      ModelSchema,
      LocalMessageSchema,
      OutMessageSchema,
      Facts
    >,
    ExecutableHandle<
      CoreContractFromFacts<
        OwnerValue,
        ModelSchema,
        LocalMessageSchema,
        OutMessageSchema,
        Facts
      >
    > {}

/** Extracts the inferred public facts without exposing the private assembly type. */
export type FactsOf<Value> =
  Value extends Readonly<{ [DescriptorTypeId]: infer Facts }> ? Facts : never

/** Extracts an acquired facade from its passive descriptor. */
export type ExecutableOf<Value> = Value extends DescriptorContract &
  Readonly<{
    [DeclaredBlockReaderTypeId]: Effect.Effect<object, any, any>
  }>
  ? Executable<
      Value['owner'],
      Value['Model'],
      Value['Message'],
      Value['OutMessage'],
      FactsOf<Value>
    >
  : Value extends Readonly<{ get: Effect.Effect<infer Output, any, any> }>
    ? Output
    : Value extends Readonly<{
          construct: () => Effect.Effect<infer Output, any, any>
        }>
      ? Output
      : never

type Provided<BlockValue extends AnyBlock> = Layer.Success<
  BlockValue['EffectsLayer']
>
type Residual<Output, BlockValue extends AnyBlock> = Exclude<
  Update.RequirementsOfResult<Output>,
  Provided<BlockValue>
>
type ProjectResult<Output, BlockValue extends AnyBlock> = ResultContract<
  OutOf<Output>,
  Residual<Output, BlockValue>
>
type ProjectOperations<BlockValue extends AnyBlock> = {
  readonly [Name in keyof BlockValue['operations']]: OperationContract<
    Tail<Parameters<BlockValue['operations'][Name]>>,
    OutOf<ReturnOf<BlockValue['operations'][Name]>>,
    Residual<ReturnOf<BlockValue['operations'][Name]>, BlockValue>
  >
}
type ProjectUpdates<
  LocalMessage,
  BlockValue extends AnyBlock,
  SourceUpdate extends AnyFunction,
> = {
  readonly [
    Tag in LocalMessage extends Readonly<{
      _tag: infer Tag extends PropertyKey
    }>
      ? Tag
      : never
  ]: ProjectResult<
    OperationOutputOf<
      SourceUpdate,
      Extract<LocalMessage, Readonly<{ _tag: Tag }>>
    >,
    BlockValue
  >
}
type ProjectView<View> = [View] extends [never]
  ? undefined
  : View extends AnyFunction
    ? ReturnOf<View> extends Document
      ? ViewContract<void, 'Document'>
      : Parameters<View> extends readonly [unknown, unknown]
        ? ViewContract<void, 'Element'>
        : Parameters<View> extends readonly [unknown, infer Inputs, unknown]
          ? ViewContract<Inputs, 'Element'>
          : never
    : undefined

type ProjectSubscription<Entry, BlockValue extends AnyBlock> =
  Entry extends Readonly<{
    modelToDependencies: (model: any) => infer Dependencies
    dependenciesToStream: (
      ...args: ReadonlyArray<any>
    ) => infer Invocation extends Stream.Stream<any, any, any>
  }>
    ? SubscriptionContract<
        Dependencies,
        Entry extends Readonly<{
          messages: infer Messages extends ReadonlyArray<Schema.Top>
        }>
          ? Messages
          : readonly [],
        Entry extends SubscriptionRequirementsEvidence<infer Requirements>
          ? Requirements
          : Stream.Services<Invocation>,
        Exclude<Stream.Services<Invocation>, Provided<BlockValue>>
      >
    : never

type ProjectSubscriptions<Entries, BlockValue extends AnyBlock> = {
  readonly [
    Key in Extract<keyof Entries, string> as [
      ProjectSubscription<Entries[Key], BlockValue>,
    ] extends [never]
      ? never
      : Key
  ]: ProjectSubscription<Entries[Key], BlockValue>
}

/** Projects checked implementation inputs into nonrecursive public channel facts. */
export type ProjectFacts<
  LocalMessageSchema extends AnySchema,
  BlockValue extends AnyBlock,
  SourceUpdate extends AnyFunction = BlockValue['update'],
> = Readonly<{
  isMessageFree: [BlockValue['Message']['Type']] extends [never] ? true : false
  initArgs: Parameters<BlockValue['init']>
  init: ProjectResult<ReturnOf<BlockValue['init']>, BlockValue>
  updateContext: Tail<Tail<Parameters<BlockValue['update']>>>
  update: ProjectResult<ReturnOf<BlockValue['update']>, BlockValue>
  updates: ProjectUpdates<LocalMessageSchema['Type'], BlockValue, SourceUpdate>
  operations: ProjectOperations<BlockValue>
  view: ProjectView<DefaultViewOf<BlockValue>>
  subscriptions: ProjectSubscriptions<BlockValue['subscriptions'], BlockValue>
  mountRequirements: Mount.RequirementsOf<BlockValue['mounts']>
  effectsLayerRequirements: Layer.Services<BlockValue['EffectsLayer']>
  effectsLayerError: Layer.Error<BlockValue['EffectsLayer']>
  hostRequirements: HandlerEvidenceOfBlock<BlockValue>
  programRequirements: RequirementsOfBlock<BlockValue>
  runtimeServices: RuntimeServicesOfBlock<BlockValue>
  decodingServices: BlockValue['Message']['DecodingServices']
  encodingServices: BlockValue['Message']['EncodingServices']
}>

/** Canonical authoring contracts needed to project an inferred checked Block. */
export interface DefinitionContract {
  readonly owner: Owner<string>
  readonly Model: AnySelfContainedSchema
  readonly Message: AnySelfContainedSchema
  readonly OutMessage?: AnySchema | undefined
}

/** Internal structural bound that leaves each acquired handle's invariant contract intact. */
interface DescriptorContracts extends DefinitionContract {
  readonly [DescriptorTypeId]: PublicFacts
  readonly OutMessage: AnySchema | undefined
}

/** @internal Common bound for descriptors with a known construction owner. */
export type DescriptorContract = DescriptorContracts

/** @internal Preserves construction channels for native, Layer-owned, and provided children. */
export type ConstructorEffectOf<Value> =
  Value extends Readonly<{
    [DeclaredBlockReaderTypeId]: infer Construction extends Effect.Effect<
      object,
      any,
      any
    >
  }>
    ? Construction
    : Value extends Readonly<{ layer: infer GraphLayer extends Layer.Any }>
      ? Effect.Effect<
          object,
          Layer.Error<GraphLayer>,
          Layer.Services<GraphLayer> | Scope.Scope | Layer.CurrentMemoMap
        >
      : Value extends Readonly<{ construct: () => infer Construction }>
        ? Construction
        : Value extends Readonly<{ get: infer Construction }>
          ? Construction
          : never

/**
 * Internal shorthand for assignability checks. Factory signatures spell the
 * Descriptor arguments directly so declaration emission materializes the facts
 * instead of retaining this alias's private implementation argument.
 */
export type DescriptorFromBlock<
  Definition extends DefinitionContract,
  BlockValue extends AnyBlock,
  ConstructorError,
  ConstructorRequirements,
  SourceUpdate extends AnyFunction = BlockValue['update'],
> = Descriptor<
  Definition['owner'],
  Definition['Model'],
  Definition['Message'],
  Definition extends Readonly<{
    OutMessage: infer OutMessageSchema extends AnySchema
  }>
    ? OutMessageSchema
    : undefined,
  ProjectFacts<Definition['Message'], BlockValue, SourceUpdate>,
  ConstructorError,
  ConstructorRequirements
>

interface CoreContractFields<
  OwnerValue extends Owner<string>,
  ModelSchema extends AnySchema,
  LocalMessageSchema extends AnySchema,
  OutMessageSchema extends AnySchema | undefined,
  Facts extends PublicFacts,
>
  extends
    CompletionProof,
    CompletionContractProof<
      ModelSchema,
      DispatchSchema<
        OwnerValue,
        LocalMessageSchema,
        Facts['decodingServices'],
        Facts['encodingServices'],
        Facts['isMessageFree']
      >
    > {
  readonly owner: OwnerValue
  readonly Model: ModelSchema
  readonly Message: DispatchSchema<
    OwnerValue,
    LocalMessageSchema,
    Facts['decodingServices'],
    Facts['encodingServices'],
    Facts['isMessageFree']
  >
  readonly init: ExecutableMembers<
    OwnerValue,
    ModelSchema,
    LocalMessageSchema,
    OutMessageSchema,
    Facts
  >['init']
  readonly update: ExecutableMembers<
    OwnerValue,
    ModelSchema,
    LocalMessageSchema,
    OutMessageSchema,
    Facts
  >['update']
  readonly operations: ExecutableMembers<
    OwnerValue,
    ModelSchema,
    LocalMessageSchema,
    OutMessageSchema,
    Facts
  >['operations']
  readonly EffectsLayer: ExecutableMembers<
    OwnerValue,
    ModelSchema,
    LocalMessageSchema,
    OutMessageSchema,
    Facts
  >['EffectsLayer']
  readonly bindings: readonly []
  readonly mounts: readonly []
  readonly [LocalMountsTypeId]: readonly []
  readonly [PublicMountRequirementsTypeId]: Facts['mountRequirements']
  readonly [PublicRuntimeServicesTypeId]: Facts['runtimeServices']
  readonly subscriptions: SubscriptionsFromFacts<
    ModelSchema['Type'],
    DispatchSchema<
      OwnerValue,
      LocalMessageSchema,
      Facts['decodingServices'],
      Facts['encodingServices'],
      Facts['isMessageFree']
    >['Type'],
    Facts['subscriptions'],
    InternalExecution<OwnerValue>
  >
  readonly managedResources: Readonly<Record<string, never>>
  readonly [LocalEffectsLayerTypeId]: ExecutableMembers<
    OwnerValue,
    ModelSchema,
    LocalMessageSchema,
    OutMessageSchema,
    Facts
  >['EffectsLayer']
  readonly __blockHandlerRequirements: Facts['hostRequirements']
  readonly hostHandlers: readonly []
  readonly makeView: never
  readonly replaceEffectsLayer: never
  readonly provideHandlers: never
}

/** Internal authoring adapter; its private inventories describe no public runtime value. */
export type CoreContractFromFacts<
  OwnerValue extends Owner<string>,
  ModelSchema extends AnySchema,
  LocalMessageSchema extends AnySchema,
  OutMessageSchema extends AnySchema | undefined,
  Facts extends PublicFacts,
> = CoreContractFields<
  OwnerValue,
  ModelSchema,
  LocalMessageSchema,
  OutMessageSchema,
  Facts
> &
  (OutMessageSchema extends AnySchema
    ? Readonly<{ OutMessage: OutMessageSchema }>
    : Readonly<{ OutMessage?: never }>) &
  (Facts['view'] extends ViewContract<unknown, 'Element' | 'Document'>
    ? Readonly<{
        [DefaultViewTypeId]: ExecutableView<
          ModelSchema['Type'],
          DispatchMessage<
            OwnerValue,
            LocalMessageSchema,
            Facts['isMessageFree']
          >,
          Facts['view']
        >
      }>
    : Readonly<{ [DefaultViewTypeId]?: never }>)

/** Internal type adapter for existing authoring signatures; no descriptor value is completed. */
export type CoreContract<
  Value extends Readonly<{
    owner: Owner<string>
    Model: AnySchema
    Message: AnySchema
    OutMessage: AnySchema | undefined
    [DescriptorTypeId]: PublicFacts
  }>,
> = CoreContractFromFacts<
  Value['owner'],
  Value['Model'],
  Value['Message'],
  Value['OutMessage'],
  Value[typeof DescriptorTypeId]
>

/** Internal policy adapter retaining a descriptor's known required OutMessage Schema. */
export type CoreOutMessageContract<
  Value extends Readonly<{
    owner: Owner<string>
    Model: AnySchema
    Message: AnySchema
    OutMessage: AnySchema
    [DescriptorTypeId]: PublicFacts
  }>,
> = CoreContractFields<
  Value['owner'],
  Value['Model'],
  Value['Message'],
  Value['OutMessage'],
  Value[typeof DescriptorTypeId]
> &
  Readonly<{
    Message: DispatchSchema<
      Value['owner'],
      Value['Message'],
      Value[typeof DescriptorTypeId]['decodingServices'],
      Value[typeof DescriptorTypeId]['encodingServices'],
      Value[typeof DescriptorTypeId]['isMessageFree']
    >
    OutMessage: Value['OutMessage']
  }> &
  (Value[typeof DescriptorTypeId]['view'] extends ViewContract<
    unknown,
    'Element' | 'Document'
  >
    ? Readonly<{
        [DefaultViewTypeId]: ExecutableView<
          Value['Model']['Type'],
          DispatchMessage<
            Value['owner'],
            Value['Message'],
            Value[typeof DescriptorTypeId]['isMessageFree']
          >,
          Value[typeof DescriptorTypeId]['view']
        >
      }>
    : Readonly<{ [DefaultViewTypeId]?: never }>)
