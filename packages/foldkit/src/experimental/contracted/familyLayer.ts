import {
  type Context,
  type Effect,
  type Layer,
  Predicate,
  type Schema,
  type Scope,
} from 'effect'

import {
  type NamespaceIdentity,
  namespaceSourceOf,
} from '../../block/namespaceIdentity.js'
import type { Owner } from '../../block/owner.js'
import type {
  HandlerOfHostDefinition,
  HandlerRequirements,
} from '../../block/requirements.js'
import type {
  ConstructorBody,
  SourceOf,
  Validate,
} from '../constructed/authoring.js'
import type {
  DeclaredBlockReaderTypeId,
  DescriptorTypeId,
  PublicFacts,
} from '../constructed/contract.js'
import type {
  AcquiredConstructorBody,
  CustomConstructorFields,
  ImplementationRecord,
  RecordAcquisition,
  ValidateImplementationRecord,
} from './completionRecord.js'
import type {
  ActualFacts,
  Contract,
  ContractConfiguration,
  ContractGraph,
  DeclaredFacts,
  DefinitionConfigurationArguments,
  FamilyValidation,
  HostContractValidation,
  HostDefinitions,
  InMessageUpdateBodyValidation,
  NativeBody,
  NominalId,
  PublishedMountValidation,
  ValidateConstructorBody,
  ValidateFamilyHandlers,
  WithoutPendingHandlers,
} from './contract.js'
import type { EffectsContract } from './effectsContract.js'
import type {
  FamilyAuthoring,
  FamilyContract,
  FamilyContractOf,
  FamilyDefinition,
} from './family.js'
import {
  makeFamilyContractRuntime,
  makeFamilyLayerDefinitionRuntime,
} from './familyRuntime.js'
import type {
  SelectedImplementationFacts,
  SelectedPublicIdentity,
} from './implementationFacts.js'
import type {
  FamilyReaderCapability,
  FamilySelection,
} from './readableProvider.js'
import {
  type MessageFreeValidation,
  snapshotDefinitionConfiguration,
} from './runtime.js'

type AnySchema = Schema.Codec<any, any, any, any>
type AnySelfContainedSchema = Schema.Codec<any, any, never, never>
type AnyFunction = (...args: ReadonlyArray<any>) => any
type Declaration = ContractConfiguration &
  Readonly<{
    Model: AnySelfContainedSchema
    Message: AnySelfContainedSchema
    OutMessage?: AnySchema
    ChildInitContext?: AnySchema
  }>
type OptionalSchema<Config, Key extends PropertyKey> =
  Config extends Readonly<Record<Key, infer Value extends AnySchema>>
    ? Value
    : undefined
type IsUnion<Value, Whole = Value> = Value extends unknown
  ? [Whole] extends [Value]
    ? false
    : true
  : never
declare const FamilyLayerProofTypeId: unique symbol
declare const FamilyAuthoringParametersTypeId: unique symbol

/** @internal Original specialization identity carried through ordinary Layer combinators. */
export interface FamilyLayerProof<Contract, Pending> {
  readonly [FamilyLayerProofTypeId]: (
    value: readonly [Contract, Pending],
  ) => readonly [Contract, Pending]
}
/** @internal An ordinary Layer retaining exact family identity and pending handlers. */
export type FamilySpecializationLayer<
  Contract,
  Error = never,
  Requirements = never,
  Pending = never,
  Facts extends PublicFacts | never = never,
> = Layer.Layer<
  | FamilyLayerProof<Contract, Pending>
  | ([Facts] extends [never]
      ? never
      : Contract extends Readonly<{
            owner: infer Owner
            get: infer Read extends Effect.Effect<any, any, any>
          }>
        ?
            | Effect.Services<Read>
            | SelectedImplementationFacts<
                Effect.Services<Read>,
                Owner,
                Facts,
                Pending
              >
        : never),
  Error,
  Requirements
>
/** @internal Bound family helpers whose completion returns an ordinary Layer. */
export type FamilyLayerDefinition<
  Id extends string,
  ModelSchema extends AnySelfContainedSchema,
  MessageSchema extends AnySelfContainedSchema,
  OutMessageSchema extends AnySchema | undefined,
  ChildInitContextSchema extends AnySchema | undefined,
  Config extends ContractConfiguration,
> = Omit<
  FamilyDefinition<
    Id,
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    ChildInitContextSchema,
    Config
  >,
  'makeBlock'
> &
  Readonly<{
    readonly [FamilyAuthoringParametersTypeId]: readonly [
      Id,
      ModelSchema,
      MessageSchema,
      OutMessageSchema,
      ChildInitContextSchema,
      Config,
    ]
    makeLayer: MakeFamilyLayer<
      Id,
      ModelSchema,
      MessageSchema,
      OutMessageSchema,
      Config
    >
  }>
type SelectedFacts<Declaration extends FamilyAuthoring, Hosts, Handlers> =
  FamilyContract<
    Declaration,
    never,
    never,
    never,
    Hosts,
    Handlers
  > extends Readonly<{ [DescriptorTypeId]: infer Facts extends PublicFacts }>
    ? Facts
    : never
type SelectedConfiguration<
  Config extends ContractConfiguration,
  Facts extends PublicFacts,
> = Config &
  Readonly<{
    effects: EffectsContract<
      Facts['effectsLayerError'],
      Facts['effectsLayerRequirements']
    >
  }>
type SelectedAuthoring<Declaration extends FamilyAuthoring, Hosts, Handlers> =
  Declaration extends Readonly<{
    [FamilyAuthoringParametersTypeId]: readonly [
      infer Id extends string,
      infer ModelSchema extends AnySelfContainedSchema,
      infer MessageSchema extends AnySelfContainedSchema,
      infer OutMessageSchema extends AnySchema | undefined,
      infer ChildInitContextSchema extends AnySchema | undefined,
      infer Config extends ContractConfiguration,
    ]
  }>
    ? FamilyLayerDefinition<
        Id,
        ModelSchema,
        MessageSchema,
        OutMessageSchema,
        ChildInitContextSchema,
        SelectedConfiguration<
          Config,
          SelectedFacts<Declaration, Hosts, Handlers>
        >
      >
    : never
type FamilyCompletion<
  Declaration extends FamilyAuthoring,
  Identifier,
  Hosts,
  Handlers,
> =
  Declaration extends Readonly<{
    [FamilyAuthoringParametersTypeId]: readonly [
      infer Id extends string,
      infer ModelSchema extends AnySelfContainedSchema,
      infer MessageSchema extends AnySelfContainedSchema,
      infer OutMessageSchema extends AnySchema | undefined,
      AnySchema | undefined,
      infer Config extends ContractConfiguration,
    ]
  }>
    ? MakeFamilyProviderLayer<
        Id,
        ModelSchema,
        MessageSchema,
        OutMessageSchema,
        SelectedConfiguration<
          Config,
          SelectedFacts<Declaration, Hosts, Handlers>
        >,
        Identifier,
        Hosts,
        Handlers,
        SelectedFacts<Declaration, Hosts, Handlers>
      >
    : never
/** @internal One passive family Block with exact selected contracts and ordinary completion. */
export type UnifiedFamilyBlock<
  Declaration extends FamilyAuthoring,
  Identifier,
  Error = never,
  Requirements = never,
  Hosts = never,
  Handlers = undefined,
  Members extends object = Readonly<Record<never, never>>,
> = Omit<
  FamilyContract<
    Declaration,
    Identifier,
    Error,
    Requirements,
    Hosts,
    Handlers,
    Members
  >,
  'provideHandlers' | 'get' | typeof DeclaredBlockReaderTypeId
> &
  Omit<
    SelectedAuthoring<Declaration, Hosts, Handlers>,
    | keyof FamilyContractOf<Declaration>
    | 'makeLayer'
    | 'makeBlock'
    | 'provideHandlers'
    | typeof DeclaredBlockReaderTypeId
  > &
  FamilySelection<
    Identifier,
    SelectedPublicIdentity<
      FamilyContract<
        Declaration,
        Identifier,
        Error,
        Requirements,
        Hosts,
        Handlers
      >
    >,
    Error,
    Requirements,
    Handlers extends Layer.Any ? never : Hosts
  > &
  Readonly<{
    readonly [DeclaredBlockReaderTypeId]: FamilyContract<
      Declaration,
      Identifier,
      Error,
      Requirements,
      Hosts,
      Handlers
    >['get'] extends infer Read
      ? Read extends Effect.Effect<
          infer Executable,
          infer ConstructionError,
          infer ConstructionRequirements
        >
        ? Effect.Effect<
            Executable,
            ConstructionError,
            | Exclude<ConstructionRequirements, Identifier>
            | FamilyReaderCapability<
                Identifier,
                SelectedPublicIdentity<
                  FamilyContract<
                    Declaration,
                    Identifier,
                    Error,
                    Requirements,
                    Hosts,
                    Handlers
                  >
                >
              >
          >
        : Read
      : never
    makeLayer: FamilyCompletion<Declaration, Identifier, Hosts, Handlers>
    provideHandlers: [Hosts] extends [never]
      ? never
      : <const Selected extends Layer.Any>(
          handlers: Selected & ValidateFamilyHandlers<Hosts, Selected>,
        ) => UnifiedFamilyBlock<
          Declaration,
          Identifier,
          Error,
          Requirements,
          Hosts,
          Selected,
          Members
        >
  }>

type ReservedMember =
  | 'owner'
  | 'Model'
  | 'Instance'
  | 'Message'
  | 'InMessage'
  | 'OutMessage'
  | 'get'
  | 'layer'
  | 'then'
  | 'provideHandlers'
  | 'makeLayer'
  | 'makeComposition'
  | 'makeStep'
  | 'makeFieldsStep'
  | 'makeCommandsStep'
  | 'makeOutMessageStep'
  | 'makeNoopStep'
  | 'makeRequiredFieldBinding'
  | 'makeOptionalFieldBinding'
  | 'makeOptionalKeyedFieldBinding'
  | 'makeKeyedArrayBinding'
  | 'makeRecordBinding'
  | 'makeHashMapBinding'
  | 'makeCustomBinding'
  | 'makeCustomKeyedBinding'
  | 'makeVariantBinding'
  | 'makeOutMessageFold'
  | 'makeOutMessageForward'
  | 'makeCommand'
  | 'makeMount'
  | 'makeMountStream'
  | 'makeResource'
  | 'makeSubscriptions'
  | 'makeManagedResources'
  | 'mounts'
  | 'bindings'
  | 'ChildInitContext'
type ValidateMembers<Members> = [
  Extract<keyof Members, ReservedMember>,
] extends [never]
  ? unknown
  : Readonly<{ reservedFamilyMembers: Extract<keyof Members, ReservedMember> }>

/** @internal Declares a Schema specialization completed by an ordinary family Layer. */
export function makeFamilyDeclaration<
  const Id extends string,
  const Key extends symbol,
  const Config extends Omit<Declaration, 'key'>,
>(
  id: Id | NamespaceIdentity<Id>,
  config: Config &
    Readonly<{ key: Key }> &
    (symbol extends Key ? never : true extends IsUnion<Key> ? never : unknown),
  ..._validation: readonly [
    ...MessageFreeValidation<NoInfer<Config & Readonly<{ key: Key }>>>,
    ...DefinitionConfigurationArguments<
      NoInfer<Config & Readonly<{ key: Key }>>
    >,
  ]
): FamilyLayerDefinition<
  Id,
  Config['Model'],
  Config['Message'],
  OptionalSchema<Config, 'OutMessage'>,
  OptionalSchema<Config, 'ChildInitContext'>,
  Config & Readonly<{ key: Key }>
>
export function makeFamilyDeclaration(
  id: string | object,
  config: Declaration,
  ..._validation: ReadonlyArray<unknown>
): object {
  const snapshot = snapshotDefinitionConfiguration(config)

  if (Predicate.isString(id)) {
    return makeFamilyLayerDefinitionRuntime(id, snapshot)
  }

  const source = namespaceSourceOf(id)

  return makeFamilyLayerDefinitionRuntime(
    source.id,
    snapshot,
    source.makeDefinition({
      Model: snapshot.Model,
      Message: snapshot.Message,
      OutMessage: snapshot.OutMessage,
      ChildInitContext: snapshot.ChildInitContext,
    }),
  )
}

/** @internal Resolves a specialization through its scoped universal implementation provider. */
export function resolveFamily<
  const Definition extends FamilyAuthoring,
  Identifier,
  Service extends import('./familyRuntime.js').FamilyLifetime,
  Error,
  Requirements,
>(
  definition: Definition,
  service: Context.Service<Identifier, Service>,
  construct: (
    implementation: Service,
  ) => FamilySpecializationLayer<
    FamilyContractOf<Definition>,
    Error,
    Requirements
  >,
): UnifiedFamilyBlock<Definition, Identifier, Error, Requirements>
/** Registers library-owned conveniences on the final authenticated descriptor. */
export function resolveFamily<
  const Definition extends FamilyAuthoring,
  Identifier,
  Service extends import('./familyRuntime.js').FamilyLifetime,
  Error,
  Requirements,
  const Members extends object,
>(
  definition: Definition,
  service: Context.Service<Identifier, Service>,
  construct: (
    implementation: Service,
  ) => FamilySpecializationLayer<
    FamilyContractOf<Definition>,
    Error,
    Requirements
  >,
  options: Readonly<{
    members: Members & ValidateMembers<Members>
    hostHandlers?: never
    handlers?: never
  }>,
): UnifiedFamilyBlock<
  Definition,
  Identifier,
  Error,
  Requirements,
  never,
  undefined,
  Members
>
/** Selects original host handlers while registering a library's canonical descriptor. */
export function resolveFamily<
  const Definition extends FamilyAuthoring,
  Identifier,
  Service extends import('./familyRuntime.js').FamilyLifetime,
  Error,
  Requirements,
  const Hosts extends ReadonlyArray<unknown>,
  const Handlers extends Layer.Any,
  const Members extends object = Readonly<Record<never, never>>,
>(
  definition: Definition,
  service: Context.Service<Identifier, Service>,
  construct: (
    implementation: Service,
  ) => FamilySpecializationLayer<
    FamilyContractOf<Definition>,
    Error,
    Requirements,
    Hosts[number]
  >,
  options: Readonly<{
    hostHandlers: Hosts
    handlers: Handlers & ValidateFamilyHandlers<Hosts[number], Handlers>
    members?: Members & ValidateMembers<Members>
  }>,
): UnifiedFamilyBlock<
  Definition,
  Identifier,
  Error,
  Requirements,
  Hosts[number],
  Handlers,
  Members
>
/** Retains original host handlers as explicit requirements of an acquired specialization. */
export function resolveFamily<
  const Definition extends FamilyAuthoring,
  Identifier,
  Service extends import('./familyRuntime.js').FamilyLifetime,
  Error,
  Requirements,
  const Hosts extends ReadonlyArray<unknown>,
  const Members extends object = Readonly<Record<never, never>>,
>(
  definition: Definition,
  service: Context.Service<Identifier, Service>,
  construct: (
    implementation: Service,
  ) => FamilySpecializationLayer<
    FamilyContractOf<Definition>,
    Error,
    Requirements,
    Hosts[number]
  >,
  options: Readonly<{
    hostHandlers: Hosts
    handlers?: never
    members?: Members & ValidateMembers<Members>
  }>,
): UnifiedFamilyBlock<
  Definition,
  Identifier,
  Error,
  Requirements,
  Hosts[number],
  undefined,
  Members
>
export function resolveFamily(
  definition: object,
  service: Context.Service<any, import('./familyRuntime.js').FamilyLifetime>,
  construct: AnyFunction,
  options?: Readonly<{
    hostHandlers?: ReadonlyArray<unknown>
    handlers?: Layer.Any
    members?: object
  }>,
): object {
  return makeFamilyContractRuntime(
    definition,
    service,
    construct,
    options,
    'Layer',
  )
}

/** @internal Validates a passive family template and returns an ordinary Layer. */
export interface MakeFamilyLayer<
  Id extends string,
  ModelSchema extends AnySelfContainedSchema,
  MessageSchema extends AnySelfContainedSchema,
  OutMessageSchema extends AnySchema | undefined,
  Config extends ContractConfiguration,
> {
  <const Record extends ImplementationRecord>(
    implementation: Record & ValidateImplementationRecord<Record>,
    ...validation: NoInfer<
      readonly [
        ...Validate<
          NominalId<Id, Config['key']>,
          ModelSchema,
          MessageSchema,
          OutMessageSchema,
          NativeBody<AcquiredConstructorBody<Record>, Config>,
          'Equivalent'
        >,
        ...PublishedMountValidation<
          SourceOf<NoInfer<AcquiredConstructorBody<Record>>>,
          Config
        >,
        ...InMessageUpdateBodyValidation<
          NoInfer<AcquiredConstructorBody<Record>>,
          Config
        >,
        ...FamilyValidation<
          MessageSchema,
          OutMessageSchema,
          Config,
          NoInfer<AcquiredConstructorBody<Record>>,
          Owner<NominalId<Id, Config['key']>, true>
        >,
      ]
    >
  ): FamilySpecializationLayer<
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
    Effect.Error<RecordAcquisition<Record>>,
    Exclude<
      Effect.Services<RecordAcquisition<Record>>,
      Scope.Scope | Layer.CurrentMemoMap
    >,
    HostDefinitions<AcquiredConstructorBody<Record>>,
    ActualFacts<MessageSchema, AcquiredConstructorBody<Record>, Config>
  >
  <const Body extends ConstructorBody, Error, Requirements>(
    constructor: Effect.Effect<Body, Error, Requirements> &
      CustomConstructorFields &
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
  ): FamilySpecializationLayer<
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
    HostDefinitions<Body>,
    ActualFacts<MessageSchema, Body, Config>
  >
}

type FamilyProviderFacts<
  Facts extends PublicFacts,
  Handlers,
  Pending,
> = Handlers extends Layer.Any
  ? Omit<
      WithoutPendingHandlers<Facts, HandlerOfHostDefinition<Pending>>,
      | 'effectsLayerRequirements'
      | 'effectsLayerError'
      | 'hostRequirements'
      | 'programRequirements'
    > &
      Readonly<{
        effectsLayerRequirements:
          | Facts['effectsLayerRequirements']
          | Layer.Services<Handlers>
        effectsLayerError: Facts['effectsLayerError'] | Layer.Error<Handlers>
        hostRequirements:
          | Exclude<Facts['hostRequirements'], HandlerOfHostDefinition<Pending>>
          | HandlerRequirements<Layer.Services<Handlers>>
        programRequirements:
          | Exclude<
              Facts['programRequirements'],
              HandlerOfHostDefinition<Pending>
            >
          | Layer.Services<Handlers>
      }>
  : Facts

/** @internal Checks a selected family implementation with its original host declarations. */
export interface MakeFamilyProviderLayer<
  Id extends string,
  ModelSchema extends AnySelfContainedSchema,
  MessageSchema extends AnySelfContainedSchema,
  OutMessageSchema extends AnySchema | undefined,
  Config extends ContractConfiguration,
  Identifier,
  Hosts,
  Handlers,
  Declared extends PublicFacts,
> {
  <const Record extends ImplementationRecord>(
    implementation: Record & ValidateImplementationRecord<Record>,
    ...validation: NoInfer<
      readonly [
        ...Validate<
          NominalId<Id, Config['key']>,
          ModelSchema,
          MessageSchema,
          OutMessageSchema,
          NativeBody<AcquiredConstructorBody<Record>, Config>,
          'Equivalent'
        >,
        ...PublishedMountValidation<
          SourceOf<NoInfer<AcquiredConstructorBody<Record>>>,
          Config
        >,
        ...InMessageUpdateBodyValidation<
          NoInfer<AcquiredConstructorBody<Record>>,
          Config
        >,
        ...HostContractValidation<
          ActualFacts<
            MessageSchema,
            NoInfer<AcquiredConstructorBody<Record>>,
            Config
          >,
          Declared,
          HostDefinitions<NoInfer<AcquiredConstructorBody<Record>>>
        >,
        ...([
          HostDefinitions<NoInfer<AcquiredConstructorBody<Record>>>,
        ] extends [Hosts]
          ? [Hosts] extends [
              HostDefinitions<NoInfer<AcquiredConstructorBody<Record>>>,
            ]
            ? readonly []
            : readonly [originalFamilyHostHandlers: never]
          : readonly [originalFamilyHostHandlers: never]),
      ]
    >
  ): Layer.Layer<
    | FamilyReaderCapability<
        Identifier,
        ContractGraph<
          Owner<NominalId<Id, Config['key']>, true>,
          ModelSchema,
          MessageSchema,
          OutMessageSchema,
          Declared
        >
      >
    | ContractGraph<
        Owner<NominalId<Id, Config['key']>, true>,
        ModelSchema,
        MessageSchema,
        OutMessageSchema,
        Declared
      >
    | SelectedImplementationFacts<
        ContractGraph<
          Owner<NominalId<Id, Config['key']>, true>,
          ModelSchema,
          MessageSchema,
          OutMessageSchema,
          Declared
        >,
        Owner<NominalId<Id, Config['key']>, true>,
        FamilyProviderFacts<
          ActualFacts<MessageSchema, AcquiredConstructorBody<Record>, Config>,
          Handlers,
          HostDefinitions<AcquiredConstructorBody<Record>>
        >,
        Handlers extends Layer.Any
          ? never
          : HostDefinitions<AcquiredConstructorBody<Record>>
      >,
    Effect.Error<RecordAcquisition<Record>>,
    Exclude<
      Effect.Services<RecordAcquisition<Record>>,
      Scope.Scope | Layer.CurrentMemoMap
    >
  >
  <const Body extends ConstructorBody, Error, Requirements>(
    constructor: Effect.Effect<Body, Error, Requirements> &
      CustomConstructorFields &
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
        ...HostContractValidation<
          ActualFacts<MessageSchema, NoInfer<Body>, Config>,
          Declared,
          HostDefinitions<NoInfer<Body>>
        >,
        ...([HostDefinitions<NoInfer<Body>>] extends [Hosts]
          ? [Hosts] extends [HostDefinitions<NoInfer<Body>>]
            ? readonly []
            : readonly [originalFamilyHostHandlers: never]
          : readonly [originalFamilyHostHandlers: never]),
      ]
    >
  ): Layer.Layer<
    | FamilyReaderCapability<
        Identifier,
        ContractGraph<
          Owner<NominalId<Id, Config['key']>, true>,
          ModelSchema,
          MessageSchema,
          OutMessageSchema,
          Declared
        >
      >
    | ContractGraph<
        Owner<NominalId<Id, Config['key']>, true>,
        ModelSchema,
        MessageSchema,
        OutMessageSchema,
        Declared
      >
    | SelectedImplementationFacts<
        ContractGraph<
          Owner<NominalId<Id, Config['key']>, true>,
          ModelSchema,
          MessageSchema,
          OutMessageSchema,
          Declared
        >,
        Owner<NominalId<Id, Config['key']>, true>,
        FamilyProviderFacts<
          ActualFacts<MessageSchema, Body, Config>,
          Handlers,
          HostDefinitions<Body>
        >,
        Handlers extends Layer.Any ? never : HostDefinitions<Body>
      >,
    Error,
    Exclude<Requirements, Scope.Scope | Layer.CurrentMemoMap>
  >
}
