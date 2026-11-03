import type { Effect, Layer, Schema } from 'effect'

import type {
  BindChildConfigKey,
  BindChildContextualProperties,
  BindingViewContract,
  GeneralKeyedConfigKey,
  GeneralKeyedContextualProperties,
  GeneratedDeliveryRequirement,
  ItemOfReadAll,
  KeyForConfig,
  ValidateGeneralKeyedSourceWithoutPolicy,
  ValidateStaticBindingConfigWithoutPolicy,
} from '../../block/bindChild.js'
import type { AnyBinding } from '../../block/binding.js'
import type {
  BindingParent,
  ExecutableConnection,
} from '../../block/bindingConnection.js'
import type { AuthoringDefinition } from '../../block/define.js'
import type {
  Completed,
  Composition,
  ViewBuilderFor as CoreViewBuilderFor,
  ImplementationRecipeArguments,
  ImplementationRecipeValidation,
  ValidateChildBindings,
} from '../../block/definition.js'
import type { CompositionDeliveryArguments } from '../../block/delivery.js'
import type { LocalMountsTypeId } from '../../block/identity.js'
import type { ValidateChildInitContext } from '../../block/initialization.js'
import type { InstanceKey } from '../../block/instanceContext.js'
import type {
  MapBindingConfigKey,
  ContextualProperties as MapContextualProperties,
  DeliveryRequirement as MapDeliveryRequirement,
  KeyFor as MapKeyFor,
  MapBindingResultConfig as MapResultConfig,
  ValidField as MapValidField,
  ValidateConcrete as ValidateConcreteMap,
  ValidateConfig as ValidateMapConfig,
} from '../../block/mapBinding.js'
import type {
  CaseValidation,
  MakeOutMessageFold,
  OutMessageFoldCases,
  OutMessageFoldContext,
} from '../../block/outMessageFold.js'
import type {
  NormalizedFoldCaseData,
  NormalizedOutMessageFold,
} from '../../block/outMessageFoldContract.js'
import type {
  CaseValidation as ForwardCaseValidation,
  MakeOutMessageForward,
  OutMessageForward,
  OutMessageForwardCases,
  ValidateChild as ValidateForwardChild,
  ValidateForwardedCases,
} from '../../block/outMessageForward.js'
import type { Owner } from '../../block/owner.js'
import type { EmbeddedViewPlan } from '../../block/viewScope.js'
import type {
  AnyBlockView,
  BoundBlockConfig,
  BoundBlockFields,
  BoundBlockView,
} from '../../html/block.js'
import type * as Mount from '../../mount/index.js'
import type {
  AuthoringCompositionOf,
  AuthoringSource,
  CompositionOfPlan,
  Plan,
  PlanOutput,
  PlanSource,
} from '../hybrid/authoring.js'
import type { ExecutableImplementation } from '../hybrid/hybrid.js'
import type { BindingsFromSpecs, DescriptorBinding } from './bindingContract.js'
import type {
  CoreContract,
  CoreOutMessageContract,
  Descriptor,
  DescriptorContract,
  DescriptorTypeId,
  LayeredDescriptor,
  ProjectFacts,
} from './contract.js'

type AnySchema = Schema.Codec<any, any, any, any>
type AnyFunction = (...args: ReadonlyArray<any>) => any

/** @internal Selects the owner of executable graph construction. */
export type ConstructionKind = 'Effect' | 'Layer' | 'Provided'

/** @internal Common constraint for inferred constructor descriptors. */
export type AnyDescriptor = DescriptorContract

interface ProvidedChildContract {
  readonly get: Effect.Effect<object, any, any>
  readonly layer?: never
  readonly construct?: never
}

declare const AuthoringContractsTypeId: unique symbol
/** @internal Retains the parent owner without exposing its executable graph. */
export type { BindingParent } from '../../block/bindingConnection.js'

/** @internal Retains canonical local Schema contracts through complete authored plans. */
export interface SourceContracts<MessageSchema, OutMessageSchema> {
  readonly [AuthoringContractsTypeId]: readonly [
    MessageSchema,
    OutMessageSchema,
  ]
}

/** @internal Keeps the exact native Composition surface while naming its static graph once. */
export interface StaticSourceFields<
  OwnerValue extends Owner<string>,
  ModelSchema extends AnySchema,
  MessageSchema extends AnySchema,
  OutMessageSchema extends AnySchema | undefined,
  Mounts extends ReadonlyArray<Mount.LayeredMountDefinition>,
  Bindings extends ReadonlyArray<unknown>,
> extends Pick<
  Composition<
    OwnerValue,
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    Mounts,
    BindingsFromSpecs<Bindings, ModelSchema, MessageSchema, OutMessageSchema>
  >,
  'makeInit' | 'makeUpdate' | 'makeView' | 'prepareBlock'
> {
  readonly owner: OwnerValue
  readonly Model: ModelSchema
  readonly Message: Composition<
    OwnerValue,
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    Mounts,
    BindingsFromSpecs<Bindings, ModelSchema, MessageSchema, OutMessageSchema>
  >['Message']
  readonly mounts: Composition<
    OwnerValue,
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    Mounts,
    BindingsFromSpecs<Bindings, ModelSchema, MessageSchema, OutMessageSchema>
  >['mounts']
  readonly [LocalMountsTypeId]: Mounts
  readonly bindings: BindingsFromSpecs<
    Bindings,
    ModelSchema,
    MessageSchema,
    OutMessageSchema
  >
}

/** @internal Names the exact static graph retained by portable authoring plans. */
export type StaticSource<
  OwnerValue extends Owner<string>,
  ModelSchema extends AnySchema,
  MessageSchema extends AnySchema,
  OutMessageSchema extends AnySchema | undefined,
  Mounts extends ReadonlyArray<Mount.LayeredMountDefinition>,
  Bindings extends ReadonlyArray<unknown>,
> = StaticSourceFields<
  OwnerValue,
  ModelSchema,
  MessageSchema,
  OutMessageSchema,
  Mounts,
  Bindings
> &
  SourceContracts<MessageSchema, OutMessageSchema> &
  (OutMessageSchema extends AnySchema
    ? Readonly<{ OutMessage: OutMessageSchema }>
    : Readonly<{ OutMessage?: never }>)

/** @internal A complete portable implementation before executable acquisition. */
export type ConstructorBody = Readonly<{
  children: ReadonlyArray<ExecutableConnection<any, string>>
  bindings?: never
  init: Plan<unknown, 'Init', AuthoringSource>
  update: Plan<unknown, 'Update', AuthoringSource>
  receive?: Plan<unknown, 'Receive', AuthoringSource>
  view?: Plan<unknown, 'View', AuthoringSource>
  operations?: Readonly<Record<string, AnyFunction>>
  subscriptions?: object
  managedResources?: object
  EffectsLayer?: import('effect').Layer.Any
  /** Original host-owned definitions whose providers are selected before acquisition. */
  hostHandlers?: ReadonlyArray<unknown>
}>

/** @internal Recovers the exact static Composition from its init plan. */
export type SourceOf<Body extends ConstructorBody> = PlanSource<Body['init']>
type ConnectionPlacement<Value> =
  Value extends ExecutableConnection<any, infer Placement> ? Placement : never
type MissingConnections<Body extends ConstructorBody> = Exclude<
  SourceOf<Body>['bindings'][number]['placement'],
  ConnectionPlacement<Body['children'][number]>
>
type ExpectedConnection<Binding> =
  Binding extends Readonly<{ connect: AnyFunction }>
    ? ReturnType<Binding['connect']>
    : never
type InvalidConnections<Body extends ConstructorBody> = Exclude<
  Body['children'][number],
  ExpectedConnection<SourceOf<Body>['bindings'][number]>
>
type CanonicalContracts<Body extends ConstructorBody> =
  SourceOf<Body> extends SourceContracts<
    infer MessageSchema,
    infer OutMessageSchema
  >
    ? readonly [
        SourceOf<Body>['owner'],
        SourceOf<Body>['Model'],
        MessageSchema,
        OutMessageSchema,
      ]
    : never

type Equal<Left, Right> = [Left, Right] extends [Right, Left] ? true : false

/** @internal Validates original contracts, acquired children, and native completion channels. */
export type Validate<
  Id extends string,
  ModelSchema,
  MessageSchema,
  OutMessageSchema,
  Body extends ConstructorBody,
  HandlerValidation extends 'Indexed' | 'Equivalent' = 'Indexed',
> =
  Equal<
    CanonicalContracts<Body>,
    readonly [Owner<Id, true>, ModelSchema, MessageSchema, OutMessageSchema]
  > extends true
    ? [MissingConnections<Body>] extends [never]
      ? [InvalidConnections<Body>] extends [never]
        ? ImplementationRecipeArguments<
            ExecutableImplementation<Body>,
            ImplementationRecipeValidation<
              SourceOf<Body>['owner'],
              SourceOf<Body>['Model'],
              SourceOf<Body>['Message'],
              SourceOf<Body> extends {
                readonly OutMessage: infer Out extends AnySchema
              }
                ? Out
                : undefined,
              SourceOf<Body>[typeof LocalMountsTypeId],
              SourceOf<Body>['bindings'],
              ExecutableImplementation<Body>,
              HandlerValidation
            >
          >
        : readonly [incompatibleConnections: InvalidConnections<Body>]
      : readonly [missingConnections: MissingConnections<Body>]
    : readonly [incompatibleDefinition: never]

/** Completes existing Composition builders through one explicit constructor. */
export interface MakeBlock<
  Id extends string,
  ModelSchema extends AnySchema,
  MessageSchema extends AnySchema,
  OutMessageSchema extends AnySchema | undefined,
  Kind extends ConstructionKind = 'Effect',
> {
  <const Body extends ConstructorBody, Error, Requirements>(
    constructor: Effect.Effect<Body, Error, Requirements> &
      (Body extends Readonly<{ operations: infer Operations }>
        ? 'then' extends keyof Operations
          ? never
          : unknown
        : unknown),
    ...validation: Validate<
      Id,
      ModelSchema,
      MessageSchema,
      OutMessageSchema,
      NoInfer<Body>
    >
  ): Kind extends 'Layer'
    ? LayeredDescriptor<
        Owner<Id, true>,
        ModelSchema,
        MessageSchema,
        OutMessageSchema,
        ProjectFacts<
          MessageSchema,
          Completed<SourceOf<Body>, ExecutableImplementation<Body>>,
          Extract<PlanOutput<Body['update']>, AnyFunction>
        >,
        Error,
        Requirements
      >
    : Descriptor<
        Owner<Id, true>,
        ModelSchema,
        MessageSchema,
        OutMessageSchema,
        ProjectFacts<
          MessageSchema,
          Completed<SourceOf<Body>, ExecutableImplementation<Body>>,
          Extract<PlanOutput<Body['update']>, AnyFunction>
        >,
        Error,
        Requirements
      >
}

type ChildContext<SchemaValue> = SchemaValue extends AnySchema
  ? SchemaValue['Type']
  : never

/** Acquires the declared child and connects it at this Binding's exact placement. */
export interface BindingConstructor<
  Contract,
  Placement extends string,
  Error,
  Requirements,
> {
  (): Effect.Effect<
    ExecutableConnection<Contract, Placement>,
    Error,
    Requirements
  >
}

/** Yields a checked child connection while its Layer owns implementation construction. */
export interface YieldableBinding<
  Contract,
  Placement extends string,
  Error,
  Requirements,
> {
  [Symbol.iterator](): Effect.EffectIterator<
    Effect.Effect<
      ExecutableConnection<Contract, Placement>,
      Error,
      Requirements
    >
  >
}

/** @internal Embeds an authentic passive view using its child's selected private graph. */
export interface DescriptorEmbedView<
  OwnerValue,
  Model,
  ParentMessage,
  Requirements,
  Key,
> {
  <View extends AnyBlockView & EmbeddedViewPlan<OwnerValue>>(
    config: Omit<BoundBlockFields<View, ParentMessage>, 'toParentMessage'> &
      ([Key] extends [never] ? unknown : Readonly<{ key: Key }>) &
      ([Parameters<View>[0], Model] extends [Model, Parameters<View>[0]]
        ? unknown
        : never),
  ): BoundBlockConfig<BoundBlockView<View, Requirements>, ParentMessage>
}

/** @internal Retains an alternate view overload without changing ordinary native Binding contracts. */
export interface DescriptorViewExtension<
  Child extends AnyDescriptor,
  ModelSchema extends AnySchema,
  MessageSchema extends AnySchema,
  Source,
> {
  readonly embedView: DescriptorEmbedView<
    Child['owner'],
    Child['Model']['Type'],
    BindingViewContract<
      CoreContract<Child>,
      ModelSchema,
      MessageSchema,
      Source
    >['parentMessage'],
    BindingViewContract<
      CoreContract<Child>,
      ModelSchema,
      MessageSchema,
      Source
    >['requirements'],
    BindingViewContract<
      CoreContract<Child>,
      ModelSchema,
      MessageSchema,
      Source
    >['key']
  >
}

/** Creates passive child Bindings with native storage, policy, and initialization contracts. */
export interface MakeBinding<
  ModelSchema extends AnySchema,
  MessageSchema extends AnySchema,
  OutMessageSchema extends AnySchema | undefined,
  ChildInitContextSchema extends AnySchema | undefined,
  Kind extends ConstructionKind = 'Effect',
  ParentOwner = unknown,
> {
  <
    const Child extends AnyDescriptor &
      (Kind extends 'Layer'
        ? Readonly<{ layer: Layer.Any }>
        : Kind extends 'Provided'
          ? ProvidedChildContract
          : unknown),
    const Keys extends BindChildConfigKey,
    const ReadAll extends (
      model: ModelSchema['Type'],
    ) => ReadonlyArray<unknown>,
    const KeyValue extends InstanceKey,
    const Field extends string,
    const KeyField extends string,
    const ChildField extends string,
    const Source extends object,
    const InitialArguments extends Parameters<CoreContract<Child>['init']> =
      Parameters<CoreContract<Child>['init']>,
  >(
    child: Child,
    config: Source &
      Readonly<{ outMessage?: never }> &
      BindChildContextualProperties<
        Keys,
        CoreContract<Child>,
        ModelSchema,
        MessageSchema,
        OutMessageSchema,
        ReadAll,
        KeyValue,
        Field,
        KeyField,
        ChildField,
        InitialArguments,
        ChildContext<ChildInitContextSchema>
      > &
      Readonly<{
        readAll?: never
        key?: KeyField
        field?: Field
        childField?: ChildField
        writeAt?: never
      }> &
      ([CoreContract<Child>['Message']['Type']] extends [never]
        ? Readonly<{ delivery?: never; keySchema?: never }>
        : GeneratedDeliveryRequirement<
            CoreContract<Child>,
            ModelSchema['Type'],
            'key' extends Keys
              ? KeyForConfig<
                  Keys,
                  CoreContract<Child>,
                  ModelSchema,
                  KeyValue,
                  Field,
                  KeyField
                >
              : never
          >),
    ...validation: readonly [
      ...ValidateStaticBindingConfigWithoutPolicy<
        CoreContract<Child>,
        ModelSchema,
        NoInfer<Keys>,
        NoInfer<Field>,
        NoInfer<KeyField>,
        NoInfer<ChildField>,
        NoInfer<Source>
      >,
      ...(Extract<
        'construct' | 'connect',
        keyof CoreContract<Child>['operations']
      > extends never
        ? readonly []
        : readonly [reservedBindingOperation: never]),
    ]
  ): DescriptorBinding<
    Child,
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    Source,
    ChildInitContextSchema,
    Kind,
    ParentOwner
  >
  <
    const Child extends AnyDescriptor &
      Readonly<{ [DescriptorTypeId]: Readonly<{ isMessageFree: true }> }> &
      (Kind extends 'Layer'
        ? Readonly<{ layer: Layer.Any }>
        : Kind extends 'Provided'
          ? ProvidedChildContract
          : unknown),
    const Keys extends GeneralKeyedConfigKey,
    const ReadAll extends (model: ModelSchema['Type']) => ReadonlyArray<any>,
    const KeyValue extends InstanceKey,
    const Source extends object = object,
  >(
    child: Child,
    config: Source &
      Readonly<{ outMessage?: never }> &
      GeneralKeyedContextualProperties<
        Keys,
        CoreContract<Child>,
        ModelSchema,
        MessageSchema,
        OutMessageSchema,
        ReadAll,
        (item: ItemOfReadAll<NoInfer<ReadAll>>) => KeyValue,
        KeyValue
      > &
      Readonly<{
        readAll: ReadAll
        key: (item: ItemOfReadAll<NoInfer<ReadAll>>) => KeyValue
        read: (
          item: ItemOfReadAll<NoInfer<ReadAll>>,
        ) => CoreContract<Child>['Model']['Type']
        writeAt: (
          model: ModelSchema['Type'],
          key: KeyValue,
          nextChildModel: CoreContract<Child>['Model']['Type'],
        ) => ModelSchema['Type']
        field?: never
        childField?: never
        presentWhen?: never
        init?: never
        write?: never
        delivery?: never
        keySchema?: never
      }>,
    ...validation: readonly [
      ...ValidateGeneralKeyedSourceWithoutPolicy<NoInfer<Source>>,
      ...(Extract<
        'construct' | 'connect',
        keyof CoreContract<Child>['operations']
      > extends never
        ? readonly []
        : readonly [reservedBindingOperation: never]),
    ]
  ): DescriptorBinding<
    Child,
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    Source,
    ChildInitContextSchema,
    Kind,
    ParentOwner
  >
  <
    const Child extends AnyDescriptor &
      (Kind extends 'Layer'
        ? Readonly<{ layer: Layer.Any }>
        : Kind extends 'Provided'
          ? ProvidedChildContract
          : unknown),
    const Keys extends GeneralKeyedConfigKey,
    const ReadAll extends (model: ModelSchema['Type']) => ReadonlyArray<any>,
    const KeyValue extends InstanceKey,
    const Source extends object = object,
  >(
    child: Child,
    config: Source &
      Readonly<{ outMessage?: never }> &
      GeneralKeyedContextualProperties<
        Keys,
        CoreContract<Child>,
        ModelSchema,
        MessageSchema,
        OutMessageSchema,
        ReadAll,
        (item: ItemOfReadAll<NoInfer<ReadAll>>) => KeyValue,
        KeyValue
      > &
      Readonly<{
        readAll: ReadAll
        key: (item: ItemOfReadAll<NoInfer<ReadAll>>) => KeyValue
        read: (
          item: ItemOfReadAll<NoInfer<ReadAll>>,
        ) => CoreContract<Child>['Model']['Type']
        writeAt: (
          model: ModelSchema['Type'],
          key: KeyValue,
          nextChildModel: CoreContract<Child>['Model']['Type'],
        ) => ModelSchema['Type']
        field?: never
        childField?: never
        presentWhen?: never
        init?: never
        write?: never
      }> &
      ([CoreContract<Child>['Message']['Type']] extends [never]
        ? Readonly<{
            delivery?: never
            keySchema?: never
          }>
        : Readonly<{
            keySchema: Schema.Top & Schema.Schema<NoInfer<KeyValue>>
          }> &
            GeneratedDeliveryRequirement<
              CoreContract<Child>,
              ModelSchema['Type'],
              KeyValue
            >),
    ...validation: readonly [
      ...ValidateGeneralKeyedSourceWithoutPolicy<NoInfer<Source>>,
      ...(Extract<
        'construct' | 'connect',
        keyof CoreContract<Child>['operations']
      > extends never
        ? readonly []
        : readonly [reservedBindingOperation: never]),
    ]
  ): DescriptorBinding<
    Child,
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    Source,
    ChildInitContextSchema,
    Kind,
    ParentOwner
  >
}

/** Map relationships retain their ordinary key, storage, and initialization contracts. */
export interface MakeMapBinding<
  ModelSchema extends AnySchema,
  MessageSchema extends AnySchema,
  OutMessageSchema extends AnySchema | undefined,
  ChildInitContextSchema extends AnySchema | undefined,
  Kind extends ConstructionKind = 'Effect',
  ParentOwner = unknown,
> {
  <
    const Child extends AnyDescriptor &
      (Kind extends 'Layer'
        ? Readonly<{ layer: Layer.Any }>
        : Kind extends 'Provided'
          ? ProvidedChildContract
          : unknown),
    const Keys extends MapBindingConfigKey,
    const Field extends string,
    const ChildField extends string,
    const Config extends object,
  >(
    child: Child,
    config: Config &
      Readonly<{ outMessage?: never }> &
      MapContextualProperties<
        Keys,
        CoreContract<Child>,
        ModelSchema,
        Field,
        ChildField
      > &
      Readonly<{
        field: Field &
          MapValidField<CoreContract<Child>, ModelSchema, Keys, ChildField>
        childField?: ChildField
      }> &
      ([CoreContract<Child>['Message']['Type']] extends [never]
        ? Readonly<{ delivery?: never }>
        : MapDeliveryRequirement<
            CoreContract<Child>,
            ModelSchema['Type'],
            MapKeyFor<ModelSchema, Field>
          >),
    ...validation: readonly [
      ...ValidateMapConfig<CoreContract<Child>, NoInfer<Keys>, NoInfer<Config>>,
      ...ValidateConcreteMap<CoreContract<Child>>,
      ...(Extract<
        'construct' | 'connect',
        keyof CoreContract<Child>['operations']
      > extends never
        ? readonly []
        : readonly [reservedBindingOperation: never]),
    ]
  ): DescriptorBinding<
    Child,
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    MapResultConfig<Config, ModelSchema, Field>,
    ChildInitContextSchema,
    Kind,
    ParentOwner
  >
}

/** Static inference is retained; executable dispatch Codecs are available after construction. */
export type AuthoringComposition<Source extends AuthoringSource> = Omit<
  AuthoringCompositionOf<Source>,
  'Message'
>

/** Derives an extracted view helper's builder from the static authoring graph. */
export type ViewBuilderFor<CompositionValue> =
  CompositionValue extends Readonly<{
    makeInit: AnyFunction
  }>
    ? CoreViewBuilderFor<
        CompositionOfPlan<ReturnType<CompositionValue['makeInit']>>
      >
    : never

/** Registers the same static Binding inventory without acquiring child implementations. */
export interface MakeComposition<
  Id extends string,
  ModelSchema extends AnySchema,
  MessageSchema extends AnySchema,
  OutMessageSchema extends AnySchema | undefined,
  ChildInitContextSchema extends AnySchema | undefined,
> {
  (
    ...validation: CompositionDeliveryArguments<
      MessageSchema['Type'],
      readonly []
    >
  ): AuthoringComposition<
    StaticSource<
      Owner<Id, true>,
      ModelSchema,
      MessageSchema,
      OutMessageSchema,
      readonly [],
      readonly []
    >
  >
  <
    const Mounts extends ReadonlyArray<Mount.LayeredMountDefinition> =
      readonly [],
    const Bindings extends ReadonlyArray<AnyBinding> = readonly [],
  >(
    graph: Readonly<{
      mounts?: Mounts & Mount.PreciseMountRegistry<Mounts>
      bindings?: Bindings & ReadonlyArray<BindingParent<Owner<Id, true>>>
    }> &
      ValidateChildInitContext<Bindings, ChildContext<ChildInitContextSchema>> &
      ValidateChildBindings<
        Bindings,
        ModelSchema['Type'],
        MessageSchema['Type'],
        OutMessageSchema extends AnySchema ? OutMessageSchema['Type'] : never
      >,
  ): AuthoringComposition<
    StaticSource<
      Owner<Id, true>,
      ModelSchema,
      MessageSchema,
      OutMessageSchema,
      Mounts,
      Bindings
    >
  >
}

type OutMessageDescriptor = AnyDescriptor &
  Readonly<{
    OutMessage: Schema.Codec<Readonly<{ _tag: string }>, any, any, any> &
      Readonly<{ match: AnyFunction }>
  }>

/** Extends the existing exhaustive policy helper to known unconstructed child contracts. */
export interface MakeDescriptorOutMessageFold<
  Model,
  Message,
  OutMessage,
> extends MakeOutMessageFold<Model, Message, OutMessage> {
  <const Child extends OutMessageDescriptor, const Cases>(
    child: Child,
    cases: Cases &
      OutMessageFoldCases<Model, Message, CoreOutMessageContract<Child>> &
      CaseValidation<
        Model,
        Message,
        OutMessage,
        CoreOutMessageContract<Child>,
        NoInfer<Cases>
      >,
  ): NormalizedFoldCaseData<Model, Cases> extends infer Data extends
    ReadonlyArray<unknown>
    ? NormalizedOutMessageFold<
        Model,
        Child['OutMessage']['Type'],
        OutMessageFoldContext<
          Model,
          Message,
          CoreOutMessageContract<Child>,
          Cases
        >,
        readonly [...Data]
      >
    : never
}

/** Extends exhaustive forwarding to original passive child contracts. */
export interface MakeDescriptorOutMessageForward<
  ParentOutMessage,
> extends MakeOutMessageForward<ParentOutMessage> {
  <
    const Child extends OutMessageDescriptor,
    const Cases extends OutMessageForwardCases<
      ParentOutMessage,
      CoreOutMessageContract<Child>
    >,
  >(
    child: Child & ValidateForwardChild<CoreOutMessageContract<Child>>,
    cases: Cases &
      ForwardCaseValidation<
        ParentOutMessage,
        CoreOutMessageContract<Child>,
        NoInfer<Cases>
      >,
    ...validation: ValidateForwardedCases<Cases>
  ): OutMessageForward<Child['OutMessage']['Type'], ParentOutMessage>
}

/** Current Definition authorship with an inferred construction completion boundary. */
export type Definition<
  Id extends string,
  ModelSchema extends AnySchema,
  MessageSchema extends AnySchema,
  OutMessageSchema extends AnySchema | undefined,
  ChildInitContextSchema extends AnySchema | undefined,
  Kind extends ConstructionKind = 'Effect',
> = Omit<
  AuthoringDefinition<
    Id,
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    true,
    ChildInitContextSchema
  >,
  | 'makeBinding'
  | 'makeMapBinding'
  | 'makeComposition'
  | 'makeOutMessageFold'
  | 'makeOutMessageForward'
> &
  Readonly<{
    makeBlock: MakeBlock<Id, ModelSchema, MessageSchema, OutMessageSchema, Kind>
    makeBinding: MakeBinding<
      ModelSchema,
      MessageSchema,
      OutMessageSchema,
      ChildInitContextSchema,
      Kind,
      Owner<Id, true>
    >
    makeMapBinding: MakeMapBinding<
      ModelSchema,
      MessageSchema,
      OutMessageSchema,
      ChildInitContextSchema,
      Kind,
      Owner<Id, true>
    >
    makeComposition: MakeComposition<
      Id,
      ModelSchema,
      MessageSchema,
      OutMessageSchema,
      ChildInitContextSchema
    >
    makeOutMessageFold: MakeDescriptorOutMessageFold<
      ModelSchema['Type'],
      MessageSchema['Type'],
      OutMessageSchema extends AnySchema ? OutMessageSchema['Type'] : never
    >
    makeOutMessageForward: MakeDescriptorOutMessageForward<
      OutMessageSchema extends AnySchema ? OutMessageSchema['Type'] : never
    >
  }>
