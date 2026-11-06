import {
  type Context,
  type Effect,
  type Layer,
  Predicate,
  type Schema,
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
  DescriptorTypeId,
  GuaranteedLayerOutputs,
  PublicFacts,
} from '../constructed/contract.js'
import type {
  Contract,
  ContractConfiguration,
  Definition,
  DefinitionConfigurationArguments,
  Fits,
  MakeFamilyBlock,
  ValidateFamilyHandlers,
} from './contract.js'
import {
  familyLifetimeRuntime,
  makeFamilyContractRuntime,
  makeFamilyDefinitionRuntime,
} from './familyRuntime.js'
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

declare const FamilyDefinitionTypeId: unique symbol
declare const FamilyRecipeTypeId: unique symbol
declare const FamilyContractTypeId: unique symbol

type ContractFacts<Contract> =
  Contract extends Readonly<{
    [DescriptorTypeId]: infer Facts extends PublicFacts
  }>
    ? Facts
    : never
type EffectsEvidence<Contract, Error, Requirements> = readonly [
  error: Fits<Error, ContractFacts<Contract>['effectsLayerError']>,
  requirements: Fits<
    Requirements,
    ContractFacts<Contract>['effectsLayerRequirements']
  >,
]
type ExpectedEvidence<Contract> = EffectsEvidence<
  Contract,
  ContractFacts<Contract>['effectsLayerError'],
  ContractFacts<Contract>['effectsLayerRequirements']
>

type AcquisitionEvidence<Contract, Error, Requirements> = readonly [
  effects: ExpectedEvidence<Contract>,
  constructorError: Fits<Error, Error>,
  constructorRequirements: Fits<Requirements, Requirements>,
]

type WithHostRequirements<Declared extends FamilyAuthoring, Hosts> = [
  Hosts,
] extends [never]
  ? FamilyContractOf<Declared>
  : Contract<
      FamilyContractOf<Declared>['owner'],
      FamilyContractOf<Declared>['Model'],
      FamilyContractOf<Declared>['Message'],
      FamilyContractOf<Declared>['OutMessage'],
      Omit<
        ContractFacts<FamilyContractOf<Declared>>,
        'hostRequirements' | 'programRequirements'
      > &
        Readonly<{
          hostRequirements:
            | ContractFacts<FamilyContractOf<Declared>>['hostRequirements']
            | HandlerOfHostDefinition<Hosts>
          programRequirements:
            | ContractFacts<FamilyContractOf<Declared>>['programRequirements']
            | HandlerOfHostDefinition<Hosts>
        }>
    >

type WithSelectedHandlers<
  Declared extends FamilyAuthoring,
  Handlers extends Layer.Any,
> = Contract<
  FamilyContractOf<Declared>['owner'],
  FamilyContractOf<Declared>['Model'],
  FamilyContractOf<Declared>['Message'],
  FamilyContractOf<Declared>['OutMessage'],
  Omit<
    ContractFacts<FamilyContractOf<Declared>>,
    | 'effectsLayerError'
    | 'effectsLayerRequirements'
    | 'hostRequirements'
    | 'programRequirements'
  > &
    Readonly<{
      effectsLayerError:
        | ContractFacts<FamilyContractOf<Declared>>['effectsLayerError']
        | Layer.Error<Handlers>
      effectsLayerRequirements:
        | ContractFacts<FamilyContractOf<Declared>>['effectsLayerRequirements']
        | Layer.Services<Handlers>
      hostRequirements:
        | ContractFacts<FamilyContractOf<Declared>>['hostRequirements']
        | HandlerRequirements<Layer.Services<Handlers>>
      programRequirements:
        | ContractFacts<FamilyContractOf<Declared>>['programRequirements']
        | Layer.Services<Handlers>
    }>
>

type SelectedContract<Definition extends FamilyAuthoring, Hosts, Handlers> = [
  Handlers,
] extends [Layer.Any]
  ? WithSelectedHandlers<Definition, Extract<Handlers, Layer.Any>>
  : WithHostRequirements<Definition, Hosts>

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

type ValidateMembers<Members> = [
  Extract<keyof Members, ReservedMember>,
] extends [never]
  ? unknown
  : Readonly<{ reservedFamilyMembers: Extract<keyof Members, ReservedMember> }>

/**
 * A checked specialization recipe. Its private construction capability cannot
 * escape the family provider. Pending host handlers require selection or an
 * explicit original-host declaration on the family contract.
 */
export interface FamilyRecipe<
  Contract,
  Error = never,
  Requirements = never,
  Pending = never,
  Evidence = ExpectedEvidence<Contract>,
> {
  readonly [FamilyRecipeTypeId]: (
    value: readonly [Contract, Error, Requirements, Pending, Evidence],
  ) => readonly [Contract, Error, Requirements, Pending, Evidence]
  /** Supplies construction dependencies while retaining the original contract
   * and any host-handler registration still requiring selection. */
  provide<const Dependencies extends Layer.Any>(
    dependencies: Dependencies,
  ): FamilyRecipe<
    Contract,
    Error | Layer.Error<Dependencies>,
    | Exclude<Requirements, GuaranteedLayerOutputs<Dependencies>>
    | Layer.Services<Dependencies>,
    Pending,
    Evidence
  >
  readonly provideHandlers: [Pending] extends [never]
    ? never
    : <const Handlers extends Layer.Any>(
        handlers: Handlers & ValidateFamilyHandlers<Pending, Handlers>,
      ) => FamilyRecipe<
        Contract,
        Error,
        Requirements,
        never,
        EffectsEvidence<
          Contract,
          Layer.Error<Handlers>,
          Layer.Services<Handlers>
        >
      >
}

/** Typed authoring contracts whose completion produces a private family recipe. */
export type FamilyDefinition<
  Id extends string,
  ModelSchema extends AnySelfContainedSchema,
  MessageSchema extends AnySelfContainedSchema,
  OutMessageSchema extends AnySchema | undefined,
  ChildInitContextSchema extends AnySchema | undefined,
  Config extends ContractConfiguration,
> = Omit<
  Definition<
    Id,
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    ChildInitContextSchema,
    Config
  >,
  'contract' | 'makeBlock'
> &
  Readonly<{
    [FamilyDefinitionTypeId]: Definition<
      Id,
      ModelSchema,
      MessageSchema,
      OutMessageSchema,
      ChildInitContextSchema,
      Config
    >['contract']
    makeBlock: MakeFamilyBlock<
      Id,
      ModelSchema,
      MessageSchema,
      OutMessageSchema,
      Config
    >
  }>

/** A family provider's construction Scope and private specialization memoization. */
export type { FamilyLifetime } from './familyRuntime.js'

/** Allocates specialization lifetime state once per selected implementation Layer. */
export const familyLifetime = familyLifetimeRuntime

export type FamilyAuthoring = Readonly<{
  [FamilyDefinitionTypeId]: Readonly<{
    [DescriptorTypeId]: PublicFacts
    owner: Owner<string>
    Model: AnySelfContainedSchema
    Message: AnySelfContainedSchema
    OutMessage: AnySchema | undefined
    get: Effect.Effect<any, any, any>
  }>
}>

/** Public channels established before a specialization's implementation is selected. */
export type FamilyContractOf<Definition extends FamilyAuthoring> =
  Definition[typeof FamilyDefinitionTypeId]

/** A specialization supplied by one universal family implementation provider. */
export type FamilyContract<
  Definition extends FamilyAuthoring,
  Identifier,
  Error = never,
  Requirements = never,
  Hosts = never,
  Handlers = undefined,
  Members extends object = Readonly<Record<never, never>>,
> = Omit<SelectedContract<Definition, Hosts, Handlers>, 'get'> &
  Members &
  Readonly<{
    [FamilyContractTypeId]: (
      contract: FamilyContractOf<Definition>,
    ) => FamilyContractOf<Definition>
    get: [
      AcquisitionEvidence<
        SelectedContract<Definition, Hosts, Handlers>,
        Error,
        Requirements
      >,
    ] extends [readonly [readonly [true, true], true, true]]
      ? Effect.Effect<
          Effect.Success<SelectedContract<Definition, Hosts, Handlers>['get']>,
          Error,
          Identifier | Requirements
        >
      : Readonly<{
          invalidFamilyAcquisition: AcquisitionEvidence<
            SelectedContract<Definition, Hosts, Handlers>,
            Error,
            Requirements
          >
        }>
    /** Selects original host handlers for construction. Descriptor members remain
     * immutable; the acquired Block's EffectsLayer reflects this selection. */
    provideHandlers: [Hosts] extends [never]
      ? never
      : <const Selected extends Layer.Any>(
          handlers: Selected & ValidateFamilyHandlers<Hosts, Selected>,
        ) => FamilyContract<
          Definition,
          Identifier,
          Error,
          Requirements,
          Hosts,
          Selected,
          Members
        >
  }>

type IsUnion<Value, Whole = Value> = Value extends unknown
  ? [Whole] extends [Value]
    ? false
    : true
  : never

/** Declares a specialization without exposing a per-call implementation capability. */
export function makeFamilyDefinition<
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
): FamilyDefinition<
  Id,
  Config['Model'],
  Config['Message'],
  OptionalSchema<Config, 'OutMessage'>,
  OptionalSchema<Config, 'ChildInitContext'>,
  Config & Readonly<{ key: Key }>
>
export function makeFamilyDefinition(
  id: string | object,
  config: Declaration,
  ..._validation: ReadonlyArray<unknown>
): object {
  const snapshot = snapshotDefinitionConfiguration(config)

  if (Predicate.isString(id)) {
    return makeFamilyDefinitionRuntime(id, snapshot)
  }

  const source = namespaceSourceOf(id)

  return makeFamilyDefinitionRuntime(
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

/**
 * Resolves a specialization through an implementation supplied by an ordinary
 * Layer. The provider must return an authenticated recipe satisfying the
 * independent contract, including its exact handler-Layer channels.
 */
export function makeFamilyContract<
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
  ) => FamilyRecipe<FamilyContractOf<Definition>, Error, Requirements>,
): FamilyContract<Definition, Identifier, Error, Requirements>
/** Registers library-owned conveniences on the final authenticated descriptor. */
export function makeFamilyContract<
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
  ) => FamilyRecipe<FamilyContractOf<Definition>, Error, Requirements>,
  options: Readonly<{
    members: Members & ValidateMembers<Members>
    hostHandlers?: never
    handlers?: never
  }>,
): FamilyContract<
  Definition,
  Identifier,
  Error,
  Requirements,
  never,
  undefined,
  Members
>
/** Selects original host handlers while registering a library's canonical descriptor. */
export function makeFamilyContract<
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
  ) => FamilyRecipe<
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
): FamilyContract<
  Definition,
  Identifier,
  Error,
  Requirements,
  Hosts[number],
  Handlers,
  Members
>
/** Retains original host handlers as explicit requirements of an acquired specialization. */
export function makeFamilyContract<
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
  ) => FamilyRecipe<
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
): FamilyContract<
  Definition,
  Identifier,
  Error,
  Requirements,
  Hosts[number],
  undefined,
  Members
>
export function makeFamilyContract(
  definition: object,
  service: Context.Service<any, import('./familyRuntime.js').FamilyLifetime>,
  construct: AnyFunction,
  options?: Readonly<{
    hostHandlers?: ReadonlyArray<unknown>
    handlers?: Layer.Any
    members?: object
  }>,
): object {
  return makeFamilyContractRuntime(definition, service, construct, options)
}
