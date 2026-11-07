import type { Context, Effect, Layer, Schema, Scope } from 'effect'

import type { AnyBinding, RequirementsOfBindings } from '../../block/binding.js'
import type { ValidateCompleteMessageSelfContainedCodec } from '../../block/childEnvelope.js'
import type { MakeCommandsStep } from '../../block/commandsStep.js'
import type {
  Completed,
  OwnedAuthoredView,
  OwnedDocumentView,
  ValidateChildBindings,
  ValidateProvidedHandlers,
  ViewBuilderFor,
} from '../../block/definition.js'
import type { DefineStep } from '../../block/definition.js'
import type {
  AuthoredMessageTag,
  CompositionDeliveryArguments,
} from '../../block/delivery.js'
import type { DefineStepFields } from '../../block/fieldStep.js'
import type { LocalMountsTypeId } from '../../block/identity.js'
import type { AnyBindingInitRecipe } from '../../block/initRecipe.js'
import type {
  InitializationPlan,
  InitializationReturn,
  ValidateChildInitContext,
  ValidateInit,
} from '../../block/initialization.js'
import type { InstanceSchema } from '../../block/instanceSchema.js'
import type {
  OperationMessageConstructor,
  OperationParameters,
} from '../../block/operation.js'
import type { MakeOutMessageStep } from '../../block/outMessageStep.js'
import type { Owner } from '../../block/owner.js'
export type {
  ImplementationFacts,
  SelectedImplementationFacts,
} from './implementationFacts.js'
import type {
  HandlerOfHostDefinition,
  HandlerRequirements,
} from '../../block/requirements.js'
import type { RuntimeCapability } from '../../block/runtimeCapability.js'
import type { BlockView, Document } from '../../html/index.js'
import type { ManagedResource, ServiceOf } from '../../managedResource/index.js'
import type * as Mount from '../../mount/index.js'
import type { VNode } from '../../vdom.js'
import type {
  AuthoringSourceEvidence,
  Definition as ConstructedDefinition,
  ConstructorBody,
  SourceOf,
  StaticSource,
  Validate,
} from '../constructed/authoring.js'
import type {
  BindingSpecs,
  ValidateBindingParents,
} from '../constructed/bindingContract.js'
import type {
  DescriptorTypeId,
  DeclaredBlockReaderTypeId,
  Executable,
  Graph,
  GuaranteedLayerOutputs,
  ImplementationSubscriptions,
  LayeredDescriptor,
  OperationContract,
  ProjectFacts,
  PublicFacts,
  ResultContract,
  ViewContract,
} from '../constructed/contract.js'
import type { InMessagePlanSourceValidation } from '../constructed/planSourceValidation.js'
import type { RelationshipConstructors } from '../constructed/relationshipAuthoring.js'
import type {
  AuthoringSource,
  Plan,
  PlanOutput,
  ViewPlan,
  ViewWithInputs,
} from '../hybrid/authoring.js'
import type { ExecutableImplementation } from '../hybrid/hybrid.js'
import type { MakeComposableUpdatePlan } from '../hybrid/updateComposition.js'
import type {
  EffectsContract,
  EffectsErrorOf,
  EffectsRequirementsOf,
} from './effectsContract.js'
import type { FamilyRecipe } from './family.js'
import type {
  CompiledInputs,
  InMessageUpdateContext,
  InputOperationName,
  MakeInMessageUpdatePlan,
  ValidateInMessageSchema,
} from './inMessageUpdate.js'
import type { InputContract, InputOf } from './inputContract.js'
import type { LegacyManagedResourceConfiguration } from './requirementNames.js'

declare const NominalIdTypeId: unique symbol

/** @internal Retains a declaration's identity beside its readable local id. */
export type NominalId<Id extends string, Key extends symbol> = Id &
  Readonly<{ [NominalIdTypeId]: Key }>

type AnySchema = Schema.Codec<any, any, any, any>
type AnySelfContainedSchema = Schema.Codec<any, any, never, never>
type AnyFunction = (...args: ReadonlyArray<any>) => any
/** @internal Preserves the exact Effect channels of a registered Binding. */
export type BindingAcquisition<Binding> =
  Binding extends Readonly<{
    [Symbol.iterator](): Effect.EffectIterator<
      infer Acquisition extends Effect.Effect<any, any, any>
    >
  }>
    ? Acquisition
    : never
type AcquiredChildren<Bindings extends ReadonlyArray<unknown>> = {
  readonly [Index in keyof Bindings]: Effect.Success<
    BindingAcquisition<Bindings[Index]>
  >
}
type TupleContract =
  | Schema.Codec<ReadonlyArray<unknown>, any, any, any>
  | InputContract<ReadonlyArray<unknown>>
type TaggedConstructor = AnySchema & OperationMessageConstructor
type OperationProducer = (
  ...args: ReadonlyArray<never>
) => readonly [
  message: Readonly<{ _tag: string }>,
  ...context: ReadonlyArray<any>,
]
type OperationSource = TaggedConstructor | OperationProducer
type ServiceKey = Context.Key<any, any>
type Resource = ManagedResource<any, any>

/** One operation's payload constructor and promised result channels. */
export interface OperationDeclaration {
  readonly message: OperationSource
  readonly outMessage?: AnySchema
  /** Original ManagedResource contracts required by this result. */
  readonly managedResources?: ReadonlyArray<Resource>
  readonly services?: ReadonlyArray<ServiceKey>
}

/** Inputs and capabilities declared before a Block implementation is available. */
export interface ContractConfiguration {
  readonly key: symbol
  readonly isMessageFree?: true
  readonly InitArgs: TupleContract
  readonly Context?: TupleContract
  readonly InMessage?: AnySchema
  readonly InMessageContext?: TupleContract
  readonly inMessageOutputs?: Readonly<
    Record<string, Omit<OperationDeclaration, 'message'>>
  >
  readonly view?: Readonly<{
    kind: 'Element' | 'Document'
    Inputs?: AnySchema | InputContract<unknown>
    /** Registered Mounts deliberately published in callback attributes. */
    mounts?: ReadonlyArray<Mount.LayeredMountDefinition>
  }>
  readonly operations?: Readonly<
    Record<string, OperationSource | OperationDeclaration>
  >
  readonly effects?:
    | EffectsContract<unknown, unknown>
    | Readonly<{
        /** Ordinary Services required when the implementation builds its handler Layer. */
        services?: ReadonlyArray<ServiceKey>
        /** Original ManagedResource contracts whose handles the implementation needs. */
        managedResources?: ReadonlyArray<Resource>
        /** Failures from building the handler Layer; Command invocation failures become Messages. */
        Error?: AnySchema
      }>
}

type Channel<Value, Key extends PropertyKey, Default = never> =
  Value extends Readonly<Record<Key, infer Member>> ? Member : Default
type ElementOf<Value> =
  Value extends ReadonlyArray<infer Element> ? Element : never
type ServiceOfKeys<Value> =
  ElementOf<Value> extends infer Key
    ? Key extends Context.Key<infer Identifier, any>
      ? Identifier
      : never
    : never
type ResourceServices<Value> = ServiceOf<ElementOf<Value>>
type Effects<Config> = Channel<Config, 'effects'>
type Services<Config> =
  | EffectsRequirementsOf<Effects<Config>>
  | ServiceOfKeys<Channel<Effects<Config>, 'services'>>
type Resources<Config> = ResourceServices<
  Channel<Effects<Config>, 'managedResources'>
>
type HandlerError<Config> =
  | EffectsErrorOf<Effects<Config>>
  | (Channel<Effects<Config>, 'Error'> extends infer ErrorSchema
      ? ErrorSchema extends AnySchema
        ? ErrorSchema['Type']
        : never
      : never)
type Operations<Config> = Channel<
  Config,
  'operations',
  Readonly<Record<never, never>>
>
type InMessageSchema<Config> = Channel<Config, 'InMessage'>
type InMessageOutputs<Config> = Channel<
  Config,
  'inMessageOutputs',
  Readonly<Record<never, never>>
>
type InMessageContext<Config> =
  Channel<Config, 'InMessageContext'> extends infer Context
    ? [Context] extends [never]
      ? readonly []
      : Context extends TupleContract
        ? InputOf<Context>
        : readonly []
    : readonly []
type InMessageTags<Config> =
  InMessageSchema<Config> extends infer In extends AnySchema
    ? [In['Type']] extends [never]
      ? never
      : In['Type'] extends Readonly<{ _tag: infer Tag extends PropertyKey }>
        ? Tag
        : never
    : never
type InMessageConstructor<
  Config,
  Tag extends PropertyKey,
> = Tag extends keyof InMessageSchema<Config>
  ? Extract<InMessageSchema<Config>[Tag], OperationMessageConstructor>
  : never
type InMessageOutput<Config, Tag extends PropertyKey> = Channel<
  InMessageOutputs<Config>,
  Tag
>

type InvalidInMessageOutput<Config> = {
  [Tag in keyof InMessageOutputs<Config>]: [
    Exclude<
      keyof InMessageOutput<Config, Tag>,
      'outMessage' | 'services' | 'managedResources'
    >,
  ] extends [never]
    ? Fits<
        OperationOut<InMessageOutput<Config, Tag>>,
        OutValue<Channel<Config, 'OutMessage'>>
      > extends true
      ? never
      : Tag
    : Tag
}[keyof InMessageOutputs<Config>]

type InMessageConfigurationArguments<Config> =
  Config extends Readonly<{
    InMessage: infer In extends AnySchema
    Message: infer Local extends AnySchema
  }>
    ? unknown extends ValidateInMessageSchema<In>
      ? [
          | Extract<InMessageTags<Config>, AuthoredMessageTag<Local['Type']>>
          | Exclude<keyof InMessageOutputs<Config>, InMessageTags<Config>>
          | Extract<
              InputOperationName<InMessageTags<Config>>,
              keyof Operations<Config>
            >
          | InvalidInMessageOutput<Config>,
        ] extends [never]
        ? readonly []
        : readonly [invalidInMessageContract: never]
      : readonly [invalidInMessageSchema: ValidateInMessageSchema<In>]
    : Config extends
          | Readonly<{ inMessageOutputs: unknown }>
          | Readonly<{ InMessageContext: unknown }>
      ? readonly [missingInMessageSchema: never]
      : readonly []
type LegacyCodecConfiguration<Config> =
  Config extends Readonly<{
    codec: unknown
  }>
    ? true
    : never
/** @internal Checks input ownership and public requirement names before implementation exists. */
export type DefinitionConfigurationArguments<Config> = readonly [
  ...([LegacyManagedResourceConfiguration<Config>] extends [never]
    ? readonly []
    : readonly [renamedManagedResourcesRequirement: never]),
  ...([LegacyCodecConfiguration<Config>] extends [never]
    ? readonly []
    : readonly [retiredCodecDeclaration: never]),
  ...InMessageConfigurationArguments<Config>,
]

type OperationMessage<Value> = Value extends OperationSource
  ? Value
  : Value extends OperationDeclaration
    ? Value['message']
    : never
type OperationOut<Value> =
  Channel<Value, 'outMessage'> extends infer OutSchema
    ? OutSchema extends AnySchema
      ? OutSchema['Type']
      : never
    : never
type OperationRequirements<Value> =
  | ServiceOfKeys<Channel<Value, 'services'>>
  | ResourceServices<Channel<Value, 'managedResources'>>

/** @internal Operation mappings declared once and installed during completion. */
type DeclaredOperationSources<Config> = {
  readonly [Name in keyof Operations<Config>]: OperationMessage<
    Operations<Config>[Name]
  >
}

/** @internal Includes authenticated input executors only in the implementation checked by native completion. */
export type ContractOperations<
  Config,
  Body extends ConstructorBody = never,
> = DeclaredOperationSources<Config> &
  (Config extends Readonly<{ InMessage: infer In extends AnySchema }>
    ? [InputUpdateOf<Body>] extends [never]
      ? unknown
      : CompiledInputs<
          In,
          Extract<PlanOutput<InputUpdateOf<Body>>, AnyFunction>,
          SourceOf<Body>['Message']['Type'],
          SourceOf<Body>
        >
    : unknown)

type OperationFacts<Config, OwnerValue> = {
  readonly [Name in keyof Operations<Config>]: OperationContract<
    OperationMessage<Operations<Config>[Name]> extends infer Source
      ? Source extends TaggedConstructor
        ? readonly [...OperationParameters<Source>, ...UpdateContext<Config>]
        : Source extends OperationProducer
          ? Parameters<Source>
          : never
      : never,
    OperationOut<Operations<Config>[Name]>,
    | OperationRequirements<Operations<Config>[Name]>
    | RuntimeCapability<OwnerValue>
  >
} & (Config extends Readonly<{ InMessage: AnySchema }>
  ? {
      readonly [
        Tag in InMessageTags<Config> as InputOperationName<Tag>
      ]: OperationContract<
        readonly [
          ...OperationParameters<InMessageConstructor<Config, Tag>>,
          ...InMessageContext<Config>,
        ],
        OperationOut<InMessageOutput<Config, Tag>>,
        | OperationRequirements<InMessageOutput<Config, Tag>>
        | RuntimeCapability<OwnerValue>
      >
    }
  : unknown)
type ViewInputs<View> = [Channel<View, 'Inputs'>] extends [never]
  ? void
  : InputOf<Channel<View, 'Inputs'>>
type DeclaredView<Config> = [Channel<Config, 'view'>] extends [never]
  ? undefined
  : Channel<Config, 'view'> extends Readonly<{
        kind: infer Kind extends 'Element' | 'Document'
      }>
    ? ViewContract<ViewInputs<Channel<Config, 'view'>>, Kind>
    : undefined
/** @internal Retains the decoded public OutMessage channel across authoring modules. */
export type OutValue<SchemaValue> = SchemaValue extends AnySchema
  ? SchemaValue['Type']
  : never
type PublishedMounts<Config> = Channel<
  Channel<Config, 'view'>,
  'mounts',
  readonly []
>
/** @internal Checks the declared Mount registry for both completion surfaces. */
export type PublishedMountValidation<Source, Config> = [
  Exclude<
    ElementOf<PublishedMounts<Config>>,
    Source extends Readonly<{
      [LocalMountsTypeId]: ReadonlyArray<infer RegisteredMount>
    }>
      ? RegisteredMount
      : never
  >,
] extends [never]
  ? readonly []
  : readonly [publishedViewMountMustBeRegistered: never]
type UpdateContext<Config> = [Channel<Config, 'Context'>] extends [never]
  ? readonly []
  : Channel<Config, 'Context'> extends infer ContextSchema
    ? ContextSchema extends TupleContract
      ? InputOf<ContextSchema>
      : readonly []
    : readonly []

type InputFacts<Config> =
  Config extends Readonly<{ InMessage: infer In extends AnySchema }>
    ? Readonly<{
        inMessage: Readonly<{ Schema: In; context: InMessageContext<Config> }>
      }>
    : unknown

/** Flat stable facts whose values never depend on an implementation type. */
export type DeclaredFacts<
  _MessageSchema extends AnySelfContainedSchema,
  OutMessageSchema extends AnySchema | undefined,
  Config extends ContractConfiguration,
  OwnerValue = Owner<string>,
> = Readonly<{
  identity: Config['key']
  isMessageFree: Config extends Readonly<{ isMessageFree: true }> ? true : false
  initArgs: InputOf<Config['InitArgs']>
  init: ResultContract<never, Resources<Config> | RuntimeCapability<OwnerValue>>
  updateContext: UpdateContext<Config>
  update: ResultContract<
    OutValue<OutMessageSchema>,
    Resources<Config> | RuntimeCapability<OwnerValue>
  >
  updates: Readonly<Record<never, never>>
  operations: OperationFacts<Config, OwnerValue>
  view: DeclaredView<Config>
  subscriptions: Readonly<Record<never, never>>
  mountRequirements: Mount.RequirementsOf<PublishedMounts<Config>>
  effectsLayerRequirements: Services<Config> | Resources<Config>
  effectsLayerError: HandlerError<Config>
  hostRequirements: HandlerRequirements<Services<Config>>
  programRequirements: Services<Config> | Resources<Config>
  runtimeServices: RuntimeCapability<OwnerValue>
  decodingServices: never
  encodingServices: never
}> &
  InputFacts<Config>

/**
 * An independent public Block contract. A Binding reads its implementation
 * from the construction environment; this value supplies no default Layer.
 */
export interface Contract<
  OwnerValue extends Owner<string>,
  ModelSchema extends AnySelfContainedSchema,
  MessageSchema extends AnySelfContainedSchema,
  OutMessageSchema extends AnySchema | undefined,
  Facts extends PublicFacts,
> {
  readonly [DescriptorTypeId]: Facts
  readonly owner: OwnerValue
  readonly Model: ModelSchema
  /**
   * Ready occurrence Schema with a stable string key and child
   * Model. It encodes ordinary `{ key, model }` snapshots and never runs init.
   * Pending `Binding.create` requests are separate write values.
   */
  readonly Instance: InstanceSchema<OwnerValue, ModelSchema>
  readonly Message: MessageSchema
  readonly OutMessage: OutMessageSchema
  readonly InMessage: Facts extends Readonly<{
    inMessage: Readonly<{ Schema: infer In }>
  }>
    ? In
    : undefined
  readonly get: Effect.Effect<
    Executable<OwnerValue, ModelSchema, MessageSchema, OutMessageSchema, Facts>,
    never,
    ContractGraph<
      OwnerValue,
      ModelSchema,
      MessageSchema,
      OutMessageSchema,
      Facts
    >
  >
}

declare const ContractGraphTypeId: unique symbol

/** @internal Retains ordinary implementation readiness without widening family contracts. */
export declare const PendingHostHandlersTypeId: unique symbol
/** An implementation capability retaining every independently declared public channel. */
export interface ContractGraph<
  OwnerValue,
  ModelSchema,
  MessageSchema,
  OutMessageSchema,
  Facts extends PublicFacts,
> extends Graph<
  OwnerValue,
  ModelSchema,
  MessageSchema,
  OutMessageSchema,
  Facts
> {
  readonly [ContractGraphTypeId]: (facts: Facts) => Facts
}

/** A selected implementation Layer and the bounded public contract it supplies. */
export interface Block<
  OwnerValue extends Owner<string>,
  ModelSchema extends AnySelfContainedSchema,
  MessageSchema extends AnySelfContainedSchema,
  OutMessageSchema extends AnySchema | undefined,
  Facts extends PublicFacts,
  ConstructorError,
  ConstructorRequirements,
  Subscriptions extends PublicFacts['subscriptions'] = Facts['subscriptions'],
  Pending = never,
>
  extends
    Omit<
      LayeredDescriptor<
        OwnerValue,
        ModelSchema,
        MessageSchema,
        OutMessageSchema,
        PendingHandlerFacts<Facts, Pending>,
        ConstructorError,
        ConstructorRequirements
      >,
      'layer' | 'get' | 'provide'
    >,
    ImplementationSubscriptions<Subscriptions> {
  readonly [PendingHostHandlersTypeId]: Pending
  readonly InMessage: Contract<
    OwnerValue,
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    Facts
  >['InMessage']
  readonly layer: Layer.Layer<
    ContractGraph<
      OwnerValue,
      ModelSchema,
      MessageSchema,
      OutMessageSchema,
      PendingHandlerFacts<Facts, Pending>
    >,
    ConstructorError,
    Exclude<ConstructorRequirements, Scope.Scope | Layer.CurrentMemoMap>
  >
  readonly get: Contract<
    OwnerValue,
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    PendingHandlerFacts<Facts, Pending>
  >['get']
  provide<const Dependencies extends Layer.Any>(
    dependencies: Dependencies,
  ): Block<
    OwnerValue,
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    Facts,
    ConstructorError | Layer.Error<Dependencies>,
    | Exclude<ConstructorRequirements, GuaranteedLayerOutputs<Dependencies>>
    | Layer.Services<Dependencies>,
    Subscriptions,
    Pending
  >
  /** Selects providers for exactly the original host-owned definitions. The
   * selected Layer remains passive until Runtime builds the handler graph.
   * Its failure and Service channels must fit the Definition's effects contract.
   * Selection preserves those declared bounds, including Services that the
   * selected provider supplies internally.
   */
  readonly provideHandlers: [Pending] extends [never]
    ? never
    : <const Handlers extends Layer.Any>(
        handlers: Handlers &
          ValidateFamilyHandlers<Pending, Handlers> &
          ValidateHandlerSelection<Facts, Handlers>,
      ) => Block<
        OwnerValue,
        ModelSchema,
        MessageSchema,
        OutMessageSchema,
        Facts,
        ConstructorError,
        ConstructorRequirements,
        Subscriptions
      >
}

type PendingHandlerFacts<Facts extends PublicFacts, Pending> = [
  Pending,
] extends [never]
  ? Facts
  : Omit<Facts, 'hostRequirements' | 'programRequirements'> &
      Readonly<{
        hostRequirements:
          | Facts['hostRequirements']
          | HandlerOfHostDefinition<Pending>
        programRequirements:
          | Facts['programRequirements']
          | HandlerOfHostDefinition<Pending>
      }>

/** @internal Checks selected original host providers against the same declared bounds. */
export type ValidateHandlerSelection<
  Facts extends PublicFacts,
  Handlers extends Layer.Any,
> =
  Fits<Layer.Error<Handlers>, Facts['effectsLayerError']> extends true
    ? Fits<
        Layer.Services<Handlers>,
        Facts['effectsLayerRequirements']
      > extends true
      ? unknown
      : Readonly<{
          'Block host handler Services must fit the declared effects contract': Layer.Services<Handlers>
        }>
    : Readonly<{
        'Block host handler constructor errors must fit the declared effects contract': Layer.Error<Handlers>
      }>

type WithOperations<Body extends ConstructorBody, Config> = Omit<
  ExecutableImplementation<Body>,
  'operations' | 'inMessageUpdate'
> &
  Readonly<{ operations: ContractOperations<Config, Body> }>

type NativeBodyFields<Body extends ConstructorBody> = Body extends unknown
  ? Pick<Body, 'children' | 'init' | 'update'> &
      ([InputUpdateOf<Body>] extends [never]
        ? Body
        : Omit<Body, 'inMessageUpdate'>)
  : never

/** @internal Lowers the original constructor Body for native completion. */
export type NativeBody<
  Body extends ConstructorBody,
  Config,
> = Body extends unknown
  ? NativeBodyFields<Body> &
      Readonly<{ operations: ContractOperations<Config, Body> }>
  : never

type InputUpdateOf<Body> =
  Body extends Readonly<{ inMessageUpdate: infer InputUpdate }>
    ? InputUpdate
    : never

type InMessageUpdateAlternativeValidation<
  Body extends ConstructorBody,
  Config,
> =
  Config extends Readonly<{ InMessage: AnySchema }>
    ? InputUpdateOf<Body> extends Plan<
        infer InputUpdate,
        'InMessageUpdate',
        infer Source
      >
      ? [InputUpdateOf<Body>] extends [never]
        ? readonly [missingInMessageUpdatePlan: never]
        : Equal<Source, SourceOf<Body>> extends true
          ? InputUpdate extends AnyFunction
            ? Equal<
                Readonly<InMessageUpdateContext<InputUpdate>>,
                Readonly<InMessageContext<Config>>
              > extends true
              ? readonly []
              : readonly [incompatibleInMessageContext: never]
            : readonly [invalidInMessageUpdatePlan: never]
          : readonly [inMessageUpdateBelongsToAnotherComposition: never]
      : readonly [missingInMessageUpdatePlan: never]
    : [InputUpdateOf<Body>] extends [never]
      ? readonly []
      : readonly [undeclaredInMessageSchema: never]

type InMessageUpdateBodyFailures<
  Body extends ConstructorBody,
  Config,
> = Body extends unknown
  ? Exclude<InMessageUpdateAlternativeValidation<Body, Config>, readonly []>
  : never

/** @internal Checks every constructor alternative's complete InMessage plan. */
export type InMessageUpdateBodyValidation<
  Body extends ConstructorBody,
  Config,
> =
  InMessagePlanSourceValidation<Body> extends readonly []
    ? [InMessageUpdateBodyFailures<Body, Config>] extends [never]
      ? readonly []
      : InMessageUpdateBodyFailures<Body, Config>
    : InMessagePlanSourceValidation<Body>

type NativeFacts<
  MessageSchema extends AnySelfContainedSchema,
  Body extends ConstructorBody,
  Config,
> = ProjectFacts<
  MessageSchema,
  Completed<SourceOf<Body>, WithOperations<Body, Config>>,
  Extract<PlanOutput<Body['update']>, AnyFunction>
>

type ClosedResult<
  OwnerValue,
  Result extends ResultContract<unknown, unknown>,
  RuntimeServices,
> = ResultContract<
  Result['outMessage'],
  | Exclude<Result['requirements'], RuntimeServices>
  | RuntimeCapability<OwnerValue>
>

type RuntimeClosedFacts<OwnerValue, Facts extends PublicFacts> = {
  readonly [Key in keyof Facts]: Key extends 'init'
    ? ClosedResult<OwnerValue, Facts['init'], Facts['runtimeServices']>
    : Key extends 'update'
      ? ClosedResult<OwnerValue, Facts['update'], Facts['runtimeServices']>
      : Key extends 'updates'
        ? {
            readonly [Tag in keyof Facts['updates']]: ClosedResult<
              OwnerValue,
              Facts['updates'][Tag],
              Facts['runtimeServices']
            >
          }
        : Key extends 'operations'
          ? {
              readonly [Name in keyof Facts['operations']]: OperationContract<
                Facts['operations'][Name]['args'],
                Facts['operations'][Name]['outMessage'],
                | Exclude<
                    Facts['operations'][Name]['requirements'],
                    Facts['runtimeServices']
                  >
                | RuntimeCapability<OwnerValue>
              >
            }
          : Key extends 'effectsLayerRequirements'
            ? Exclude<
                Facts['effectsLayerRequirements'],
                Facts['runtimeServices']
              >
            : Key extends 'runtimeServices'
              ? RuntimeCapability<OwnerValue>
              : Facts[Key]
}

/** @internal Projects exact runtime-closed facts for both completion surfaces. */
export type ActualFacts<
  MessageSchema extends AnySelfContainedSchema,
  Body extends ConstructorBody,
  Config,
> = Body extends unknown
  ? RuntimeClosedFacts<
      SourceOf<Body>['owner'],
      NativeFacts<MessageSchema, Body, Config>
    > &
      InputFacts<Config>
  : never

type WithSelectedRuntimeServices<
  Closed extends PublicFacts,
  RuntimeServices,
> = {
  readonly [Key in keyof Closed]: Key extends 'runtimeServices'
    ? Closed[Key] | RuntimeServices
    : Closed[Key]
}

/** @internal Retains actual installed Services only on the selected implementation Layer. */
export type SelectedActualFacts<
  MessageSchema extends AnySelfContainedSchema,
  Body extends ConstructorBody,
  Config,
> = Body extends unknown
  ? WithSelectedRuntimeServices<
      ActualFacts<MessageSchema, Body, Config>,
      NativeFacts<MessageSchema, Body, Config>['runtimeServices']
    >
  : never

type IsErased<Value> = [Value] extends [never]
  ? false
  : 0 extends 1 & Value
    ? true
    : unknown extends Value
      ? true
      : false
/** @internal Rejects erased channels before checking a declared bound. */
export type Fits<Actual, Declared> =
  IsErased<Actual> extends true
    ? false
    : IsErased<Declared> extends true
      ? false
      : [Actual] extends [Declared]
        ? true
        : false
type Equal<Left, Right> = [Left, Right] extends [Right, Left] ? true : false
type InvalidOperation<
  Actual extends PublicFacts,
  Declared extends PublicFacts,
> = {
  [
    Name in keyof Declared['operations']
  ]: Name extends keyof Actual['operations']
    ? Fits<
        Actual['operations'][Name]['outMessage'],
        Declared['operations'][Name]['outMessage']
      > extends true
      ? Fits<
          Actual['operations'][Name]['requirements'],
          Declared['operations'][Name]['requirements']
        > extends true
        ? Equal<
            Readonly<Actual['operations'][Name]['args']>,
            Readonly<Declared['operations'][Name]['args']>
          > extends true
          ? never
          : Name
        : Name
      : Name
    : Name
}[keyof Declared['operations']]
type InvalidContractChannel<
  Actual extends PublicFacts,
  Declared extends PublicFacts,
> = {
  [
    Key in
      | 'effectsLayerRequirements'
      | 'effectsLayerError'
      | 'programRequirements'
      | 'decodingServices'
      | 'encodingServices'
      | 'hostRequirements'
  ]: Fits<Actual[Key], Declared[Key]> extends true ? never : Key
}[
  | 'effectsLayerRequirements'
  | 'effectsLayerError'
  | 'programRequirements'
  | 'decodingServices'
  | 'encodingServices'
  | 'hostRequirements']
type InvalidInputChannel<
  Actual extends PublicFacts,
  Declared extends PublicFacts,
> = {
  [
    Key in
      | 'initArgs'
      | 'updateContext'
      | 'runtimeServices'
      | 'view'
      | 'isMessageFree'
  ]: Equal<Readonly<Actual[Key]>, Readonly<Declared[Key]>> extends true
    ? never
    : Key
}['initArgs' | 'updateContext' | 'runtimeServices' | 'view' | 'isMessageFree']
type InvalidResultChannel<
  Actual extends PublicFacts,
  Declared extends PublicFacts,
> = {
  [Key in 'init' | 'update']: Fits<
    Actual[Key]['outMessage'],
    Declared[Key]['outMessage']
  > extends true
    ? Fits<
        Actual[Key]['requirements'],
        Declared[Key]['requirements']
      > extends true
      ? never
      : Key
    : Key
}['init' | 'update']
type ContractValidation<
  Actual extends PublicFacts,
  Declared extends PublicFacts,
> = [
  | InvalidContractChannel<Actual, Declared>
  | InvalidInputChannel<Actual, Declared>
  | InvalidResultChannel<Actual, Declared>
  | InvalidOperation<Actual, Declared>,
] extends [never]
  ? readonly []
  : readonly [
      invalidContract:
        | InvalidContractChannel<Actual, Declared>
        | InvalidInputChannel<Actual, Declared>
        | InvalidResultChannel<Actual, Declared>
        | InvalidOperation<Actual, Declared>,
    ]

type KeysOfUnion<Value> = Value extends unknown ? keyof Value : never
/** @internal Retains the original constructor field restrictions. */
export type ValidateConstructorBody<Body> =
  'operations' extends KeysOfUnion<Body> ? never : unknown

/** @internal Retains the original pending host definitions. */
export type HostDefinitions<Body> =
  Body extends Readonly<{
    hostHandlers: infer Definitions extends ReadonlyArray<unknown>
  }>
    ? Definitions[number]
    : never

type WithoutPendingOperation<Operation, Handlers> =
  Operation extends OperationContract<
    infer Args,
    infer OutMessage,
    infer Requirements
  >
    ? OperationContract<Args, OutMessage, Exclude<Requirements, Handlers>>
    : never

/** @internal Removes only the handler requirements supplied by the original host recipe. */
export type WithoutPendingHandlers<Facts extends PublicFacts, Handlers> = Omit<
  Facts,
  'init' | 'update' | 'operations' | 'hostRequirements' | 'programRequirements'
> &
  Readonly<{
    init: ResultContract<
      Facts['init']['outMessage'],
      Exclude<Facts['init']['requirements'], Handlers>
    >
    update: ResultContract<
      Facts['update']['outMessage'],
      Exclude<Facts['update']['requirements'], Handlers>
    >
    operations: {
      readonly [Name in keyof Facts['operations']]: WithoutPendingOperation<
        Facts['operations'][Name],
        Handlers
      >
    }
    hostRequirements: Exclude<Facts['hostRequirements'], Handlers>
    programRequirements: Exclude<Facts['programRequirements'], Handlers>
  }>

type PendingBounds<Facts extends PublicFacts, Config> = Omit<
  Facts,
  | 'effectsLayerRequirements'
  | 'effectsLayerError'
  | 'programRequirements'
  | 'hostRequirements'
> &
  Readonly<{
    effectsLayerRequirements: Resources<Config>
    effectsLayerError: never
    programRequirements: Resources<Config>
    hostRequirements: never
  }>

/** @internal Checks original host readiness against the declared facts. */
export type HostContractValidation<
  Actual extends PublicFacts,
  Declared extends PublicFacts,
  Hosts,
> = [Hosts] extends [never]
  ? ContractValidation<Actual, Declared>
  : ContractValidation<
      WithoutPendingHandlers<Actual, HandlerOfHostDefinition<Hosts>>,
      Declared
    >

/** @internal Checks family channels against selected or host-owned handler bounds. */
export type FamilyValidation<
  MessageSchema extends AnySelfContainedSchema,
  OutMessageSchema extends AnySchema | undefined,
  Config extends ContractConfiguration,
  Body extends ConstructorBody,
  OwnerValue,
  Declared extends PublicFacts = DeclaredFacts<
    MessageSchema,
    OutMessageSchema,
    Config,
    OwnerValue
  >,
> = [HostDefinitions<Body>] extends [never]
  ? ContractValidation<ActualFacts<MessageSchema, Body, Config>, Declared>
  : ContractValidation<
      WithoutPendingHandlers<
        ActualFacts<MessageSchema, Body, Config>,
        HandlerOfHostDefinition<HostDefinitions<Body>>
      >,
      PendingBounds<Declared, Config>
    >

/** @internal Checks a passive family template before selecting its original host providers. */
export interface MakeFamilyBlock<
  Id extends string,
  ModelSchema extends AnySelfContainedSchema,
  MessageSchema extends AnySelfContainedSchema,
  OutMessageSchema extends AnySchema | undefined,
  Config extends ContractConfiguration,
> {
  <const Body extends ConstructorBody, Error, Requirements>(
    constructor: Effect.Effect<Body, Error, Requirements> &
      ValidateConstructorBody<Body>,
    ...validation: NoInfer<
      readonly [
        ...Validate<
          NominalId<Id, Config['key']>,
          ModelSchema,
          MessageSchema,
          OutMessageSchema,
          NativeBody<Body, Config>,
          'Equivalent'
        >,
        ...PublishedMountValidation<SourceOf<NoInfer<Body>>, Config>,
        ...InMessageUpdateBodyValidation<NoInfer<Body>, Config>,
        ...FamilyValidation<
          MessageSchema,
          OutMessageSchema,
          Config,
          NoInfer<Body>,
          Owner<NominalId<Id, Config['key']>, true>
        >,
      ]
    >
  ): FamilyRecipe<
    Contract<
      Owner<NominalId<Id, Config['key']>, true>,
      ModelSchema,
      MessageSchema,
      OutMessageSchema,
      DeclaredFacts<
        MessageSchema,
        OutMessageSchema,
        Config,
        Owner<NominalId<Id, Config['key']>, true>
      >
    >,
    Error,
    Exclude<Requirements, Scope.Scope | Layer.CurrentMemoMap>,
    HostDefinitions<Body>
  >
}

/** @internal Reuses native handler coverage checks for a pending family template. */
export type ValidateFamilyHandlers<Definitions, Handlers> =
  ValidateProvidedHandlers<
    Readonly<{ hostHandlers: ReadonlyArray<Definitions> }>,
    Handlers
  >

/** Checks a constructor against native registration and the independent contract. */
export interface MakeBlock<
  Id extends string,
  ModelSchema extends AnySelfContainedSchema,
  MessageSchema extends AnySelfContainedSchema,
  OutMessageSchema extends AnySchema | undefined,
  Config extends ContractConfiguration,
> {
  <const Body extends ConstructorBody, Error, Requirements>(
    constructor: Effect.Effect<Body, Error, Requirements> &
      ValidateConstructorBody<Body>,
    ...validation: NoInfer<
      readonly [
        ...Validate<
          NominalId<Id, Config['key']>,
          ModelSchema,
          MessageSchema,
          OutMessageSchema,
          NativeBody<Body, Config>
        >,
        ...PublishedMountValidation<SourceOf<NoInfer<Body>>, Config>,
        ...InMessageUpdateBodyValidation<NoInfer<Body>, Config>,
        ...HostContractValidation<
          ActualFacts<MessageSchema, NoInfer<Body>, Config>,
          DeclaredFacts<
            MessageSchema,
            OutMessageSchema,
            Config,
            Owner<NominalId<Id, Config['key']>, true>
          >,
          HostDefinitions<NoInfer<Body>>
        >,
      ]
    >
  ): Block<
    Owner<NominalId<Id, Config['key']>, true>,
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    DeclaredFacts<
      MessageSchema,
      OutMessageSchema,
      Config,
      Owner<NominalId<Id, Config['key']>, true>
    >,
    Error,
    Requirements,
    ActualFacts<MessageSchema, NoInfer<Body>, Config>['subscriptions'],
    HostDefinitions<Body>
  >
}

type BindingsOf<Source extends AuthoringSource> =
  Source extends Readonly<{
    bindings: infer Bindings extends ReadonlyArray<AnyBinding>
  }>
    ? Bindings
    : never

/** A startup producer contextually typed by its independent input Schema. */
export interface MakeInit<
  Source extends AuthoringSource,
  Args extends ReadonlyArray<unknown>,
> {
  <
    const Output extends
      | InitializationPlan<
          Source['Model']['Type'],
          Source['Message']['Type'],
          BindingsOf<Source>
        >
      | AnyBindingInitRecipe,
    const Create extends (...args: Args) => unknown,
    const Validation extends ValidateInit<NoInfer<Create>, BindingsOf<Source>> =
      ValidateInit<NoInfer<Create>, BindingsOf<Source>>,
  >(
    create: Create & ((...args: Args) => Output),
    ...validation: Validation
  ): AuthoredInitPlan<Source, Args, Output>
}

/** @internal Retains exact startup producer channels while deriving assembled output from one Source. */
export interface AuthoredInitPlan<
  Source extends AuthoringSource,
  Args extends ReadonlyArray<unknown>,
  Output,
> extends Plan<
  NoInfer<
    (
      ...args: Args
    ) => InitializationReturn<
      Source['Model']['Type'],
      Source['Message']['Type'],
      BindingsOf<Source>,
      Output
    >
  >,
  'Init',
  Source
> {}

type ViewRequirements<Source extends AuthoringSource> =
  | Mount.RequirementsOf<Source[typeof LocalMountsTypeId]>
  | RequirementsOfBindings<Source['bindings']>

/** @internal Derives a portable element view entirely from its validated Source and inputs. */
export type AuthoredViewPlan<
  Source extends AuthoringSource,
  Inputs = void,
> = ViewPlan<
  OwnedAuthoredView<
    BlockView<
      Source['Model']['Type'],
      Source['Message']['Type'],
      Inputs,
      ViewRequirements<Source>
    >,
    Source['owner'],
    Source['Model']['Type'],
    Source['Message']['Type'],
    ViewRequirements<Source>
  >,
  Source
>

/** @internal Derives a portable document view entirely from its validated Source. */
export type AuthoredDocumentViewPlan<Source extends AuthoringSource> = ViewPlan<
  OwnedDocumentView<
    Source['owner'],
    Source['Model']['Type'],
    Source['Message']['Type'],
    ViewRequirements<Source>
  >,
  Source
>

/** A complete view expression whose input Schema also supplies contextual typing. */
export interface MakeView<Source extends AuthoringSource, Inputs> {
  (
    view: (
      model: Source['Model']['Type'],
      h: ViewBuilderFor<Source>,
    ) => Document,
  ): AuthoredDocumentViewPlan<Source>
  (
    view: (
      model: Source['Model']['Type'],
      h: ViewBuilderFor<Source>,
    ) => VNode | null,
  ): AuthoredViewPlan<Source>
  readonly withInputs: {
    (
      view: (
        model: Source['Model']['Type'],
        inputs: Inputs,
        h: ViewBuilderFor<Source>,
      ) => VNode | null,
    ): AuthoredViewPlan<Source, Inputs>
    <LocalInputs>(
      view: ViewWithInputs<
        Source['Model']['Type'],
        Source['Message']['Type'],
        LocalInputs,
        ViewRequirements<Source>,
        ViewBuilderFor<Source>
      >,
    ): AuthoredViewPlan<Source, LocalInputs>
  }
}

/** Portable Composition builders using the declared startup inputs. */
export type ContractComposition<
  Source extends AuthoringSource,
  Config extends ContractConfiguration,
> = Omit<
  Source,
  'Message' | 'prepareBlock' | 'makeInit' | 'makeUpdate' | 'makeView'
> &
  AuthoringSourceEvidence<Source> &
  Readonly<{
    /** Acquires the registered inventory inside a custom Effect constructor.
     * Ordinary record completion acquires these children internally.
     * The returned Effect preserves Binding order and is passive until executed and does not initialize
     * child Models or start their handlers and lifecycles. Use individual
     * Binding yields when construction needs their acquired handles.
     *
     * @example
     * ```ts
     * const children = yield* ApplicationComposition.acquireChildren()
     *
     * return {
     *   children,
     *   init,
     *   update,
     *   view,
     *   EffectsLayer,
     * }
     * ``` */
    acquireChildren: () => Effect.Effect<
      AcquiredChildren<Source['bindings']>,
      Effect.Error<BindingAcquisition<Source['bindings'][number]>>,
      Effect.Services<BindingAcquisition<Source['bindings'][number]>>
    >
    makeInit: MakeInit<Source, InputOf<Config['InitArgs']>>
    makeView: MakeView<Source, ViewInputs<Channel<Config, 'view'>>>
    makeUpdate: MakeComposableUpdatePlan<Source, UpdateContext<Config>>
  }> &
  (Config extends Readonly<{ InMessage: infer In extends AnySchema }>
    ? Readonly<{
        makeInMessageUpdate: MakeInMessageUpdatePlan<
          Source['Model']['Type'],
          In['Type'],
          Source['Message']['Type'],
          Source extends Readonly<{ OutMessage: infer Out extends AnySchema }>
            ? Out['Type']
            : never,
          Source['bindings'],
          Source,
          InMessageContext<Config>
        >
      }>
    : unknown)

/** Static relationship inventory with independently declared startup inference. */
export interface MakeComposition<
  Id extends string,
  ModelSchema extends AnySelfContainedSchema,
  MessageSchema extends AnySelfContainedSchema,
  OutMessageSchema extends AnySchema | undefined,
  ChildInitContextSchema extends AnySchema | undefined,
  Config extends ContractConfiguration,
> {
  (
    ...validation: CompositionDeliveryArguments<
      MessageSchema['Type'],
      readonly []
    >
  ): ContractComposition<
    StaticSource<
      Owner<NominalId<Id, Config['key']>, true>,
      ModelSchema,
      MessageSchema,
      OutMessageSchema,
      readonly [],
      readonly []
    >,
    Readonly<{ key: Config['key']; InitArgs: Config['InitArgs'] }> &
      (Config extends Readonly<{ Context: infer Context }>
        ? Readonly<{ Context: Context }>
        : unknown) &
      (Config extends Readonly<{ view: infer View }>
        ? Readonly<{ view: View }>
        : unknown) &
      (Config extends Readonly<{ InMessage: infer InMessage }>
        ? Readonly<{ InMessage: InMessage }>
        : unknown) &
      (Config extends Readonly<{ InMessageContext: infer InMessageContext }>
        ? Readonly<{ InMessageContext: InMessageContext }>
        : unknown)
  >
  <
    const Mounts extends ReadonlyArray<Mount.LayeredMountDefinition> =
      readonly [],
    const Bindings extends ReadonlyArray<AnyBinding> = readonly [],
  >(
    graph: Readonly<{
      mounts?: Mounts & Mount.PreciseMountRegistry<Mounts>
      bindings?: Bindings
    }> &
      ValidateBindingParents<
        Bindings,
        Owner<NominalId<Id, Config['key']>, true>
      > &
      ValidateChildInitContext<Bindings, OutValue<ChildInitContextSchema>> &
      ValidateChildBindings<
        Bindings,
        ModelSchema['Type'],
        MessageSchema['Type'],
        OutValue<OutMessageSchema>
      > &
      ValidateCompleteMessageSelfContainedCodec<MessageSchema, Bindings>,
  ): ContractComposition<
    StaticSource<
      Owner<NominalId<Id, Config['key']>, true>,
      ModelSchema,
      MessageSchema,
      OutMessageSchema,
      Mounts,
      BindingSpecs<Bindings>
    >,
    Readonly<{ key: Config['key']; InitArgs: Config['InitArgs'] }> &
      (Config extends Readonly<{ Context: infer Context }>
        ? Readonly<{ Context: Context }>
        : unknown) &
      (Config extends Readonly<{ view: infer View }>
        ? Readonly<{ view: View }>
        : unknown) &
      (Config extends Readonly<{ InMessage: infer InMessage }>
        ? Readonly<{ InMessage: InMessage }>
        : unknown) &
      (Config extends Readonly<{ InMessageContext: infer InMessageContext }>
        ? Readonly<{ InMessageContext: InMessageContext }>
        : unknown)
  >
}

/** @internal Retains the shared declared identity and reader slots. */
export interface DefinitionFields<
  Id extends string,
  ModelSchema extends AnySelfContainedSchema,
  MessageSchema extends AnySelfContainedSchema,
  OutMessageSchema extends AnySchema | undefined,
  ChildInitContextSchema extends AnySchema | undefined,
  Config extends ContractConfiguration,
>
  extends
    Pick<
      ConstructedDefinition<
        NominalId<Id, Config['key']>,
        ModelSchema,
        MessageSchema,
        OutMessageSchema,
        ChildInitContextSchema,
        'Provided'
      >,
      | 'owner'
      | 'Model'
      | 'Message'
      | 'mounts'
      | 'bindings'
      | 'makeStep'
      | 'makeFieldsStep'
      | 'makeNoopStep'
      | 'makeCommandsStep'
      | 'makeSubscriptions'
      | 'makeManagedResources'
      | 'makeOutMessageFold'
      | 'makeOutMessageForward'
      | 'makeCommand'
      | 'makeMount'
      | 'makeMountStream'
      | 'makeResource'
    >,
    RelationshipConstructors<
      ModelSchema,
      MessageSchema,
      OutMessageSchema,
      ChildInitContextSchema,
      'Provided',
      Owner<NominalId<Id, Config['key']>, true>
    > {
  readonly [DescriptorTypeId]: DeclaredFacts<
    MessageSchema,
    OutMessageSchema,
    Config,
    Owner<NominalId<Id, Config['key']>, true>
  >
  readonly [DeclaredBlockReaderTypeId]: Effect.Effect<
    object,
    never,
    ContractGraph<
      Owner<NominalId<Id, Config['key']>, true>,
      ModelSchema,
      MessageSchema,
      OutMessageSchema,
      DeclaredFacts<
        MessageSchema,
        OutMessageSchema,
        Config,
        Owner<NominalId<Id, Config['key']>, true>
      >
    >
  >
  readonly contract: Contract<
    Owner<NominalId<Id, Config['key']>, true>,
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    DeclaredFacts<
      MessageSchema,
      OutMessageSchema,
      Config,
      Owner<NominalId<Id, Config['key']>, true>
    >
  >
  readonly makeBlock: MakeBlock<
    Id,
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    Config
  >
  readonly makeComposition: MakeComposition<
    Id,
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    ChildInitContextSchema,
    Config
  >
}

/** @internal Names local-only authoring contracts independently of input helper specializations. */
export type BaseDefinition<
  Id extends string,
  ModelSchema extends AnySelfContainedSchema,
  MessageSchema extends AnySelfContainedSchema,
  OutMessageSchema extends AnySchema | undefined,
  ChildInitContextSchema extends AnySchema | undefined,
  Config extends ContractConfiguration,
> = DefinitionFields<
  Id,
  ModelSchema,
  MessageSchema,
  OutMessageSchema,
  ChildInitContextSchema,
  Config
> &
  Pick<
    ConstructedDefinition<
      NominalId<Id, Config['key']>,
      ModelSchema,
      MessageSchema,
      OutMessageSchema,
      ChildInitContextSchema,
      'Provided'
    >,
    Exclude<
      keyof ConstructedDefinition<
        NominalId<Id, Config['key']>,
        ModelSchema,
        MessageSchema,
        OutMessageSchema,
        ChildInitContextSchema,
        'Provided'
      >,
      keyof DefinitionFields<
        Id,
        ModelSchema,
        MessageSchema,
        OutMessageSchema,
        ChildInitContextSchema,
        Config
      >
    >
  >

/** @internal Keeps input authorship nameable across declaration consumers. */
export interface InMessageDefinitionFields<
  Id extends string,
  ModelSchema extends AnySelfContainedSchema,
  MessageSchema extends AnySelfContainedSchema,
  OutMessageSchema extends AnySchema | undefined,
  ChildInitContextSchema extends AnySchema | undefined,
  Config extends ContractConfiguration,
  In extends AnySchema,
> extends Omit<
  DefinitionFields<
    Id,
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    ChildInitContextSchema,
    Config
  >,
  'makeStep' | 'makeFieldsStep' | 'makeCommandsStep'
> {
  readonly InMessage: In
  readonly makeStep: DefineStep<
    ModelSchema['Type'],
    MessageSchema['Type'],
    OutValue<OutMessageSchema>,
    MessageSchema['Type'] | In['Type']
  >
  readonly makeFieldsStep: DefineStepFields<
    ModelSchema['Type'],
    MessageSchema['Type'],
    MessageSchema['Type'] | In['Type'],
    Owner<NominalId<Id, Config['key']>, true>
  >
  readonly makeCommandsStep: MakeCommandsStep<
    ModelSchema['Type'],
    MessageSchema['Type'],
    MessageSchema['Type'] | In['Type']
  >
}

/** @internal Names the emitting helper independently from its inferred overloads. */
export interface InMessageOutMessageFields<
  ModelSchema extends AnySelfContainedSchema,
  MessageSchema extends AnySelfContainedSchema,
  OutMessageSchema extends AnySchema,
  In extends AnySchema,
> {
  readonly makeOutMessageStep: MakeOutMessageStep<
    ModelSchema['Type'],
    MessageSchema['Type'],
    OutMessageSchema['Type'],
    MessageSchema['Type'] | In['Type']
  >
}

/** @internal Preserves named input helpers without exposing an implementation graph. */
export type InMessageDefinition<
  Id extends string,
  ModelSchema extends AnySelfContainedSchema,
  MessageSchema extends AnySelfContainedSchema,
  OutMessageSchema extends AnySchema | undefined,
  ChildInitContextSchema extends AnySchema | undefined,
  Config extends ContractConfiguration,
  In extends AnySchema,
> = InMessageDefinitionFields<
  Id,
  ModelSchema,
  MessageSchema,
  OutMessageSchema,
  ChildInitContextSchema,
  Config,
  In
> &
  Pick<
    BaseDefinition<
      Id,
      ModelSchema,
      MessageSchema,
      OutMessageSchema,
      ChildInitContextSchema,
      Config
    >,
    Exclude<
      keyof BaseDefinition<
        Id,
        ModelSchema,
        MessageSchema,
        OutMessageSchema,
        ChildInitContextSchema,
        Config
      >,
      | keyof DefinitionFields<
          Id,
          ModelSchema,
          MessageSchema,
          OutMessageSchema,
          ChildInitContextSchema,
          Config
        >
      | 'makeOutMessageStep'
    >
  > &
  (OutMessageSchema extends AnySchema
    ? InMessageOutMessageFields<
        ModelSchema,
        MessageSchema,
        OutMessageSchema,
        In
      >
    : unknown)

/** Authoring helpers retain separate incoming and Command-result Message contracts. */
export type Definition<
  Id extends string,
  ModelSchema extends AnySelfContainedSchema,
  MessageSchema extends AnySelfContainedSchema,
  OutMessageSchema extends AnySchema | undefined,
  ChildInitContextSchema extends AnySchema | undefined,
  Config extends ContractConfiguration,
> =
  Config extends Readonly<{ InMessage: infer In extends AnySchema }>
    ? InMessageDefinition<
        Id,
        ModelSchema,
        MessageSchema,
        OutMessageSchema,
        ChildInitContextSchema,
        Config,
        In
      >
    : BaseDefinition<
        Id,
        ModelSchema,
        MessageSchema,
        OutMessageSchema,
        ChildInitContextSchema,
        Config
      >
