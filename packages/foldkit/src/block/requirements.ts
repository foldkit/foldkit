import type { Effect, Layer, Scope, Stream } from 'effect'

import type { Handler as CommandHandler } from '../command/handler.js'
import type { Handler as ManagedResourceHandler } from '../managedResource/handler.js'
import type { ServicesOf as ManagedResourceServicesOf } from '../managedResource/index.js'
import type { Handler as MountHandler } from '../mount/handler.js'
import type { MountAction } from '../mount/index.js'
import type { ValidHandlerContracts } from '../runtime/handlerContracts.js'
import type { Handler as SubscriptionHandler } from '../subscription/handler.js'
import type * as Update from '../update/index.js'
import type {
  BlockOfBinding,
  HandlerRequirementsOfBinding,
  InspectionOfBinding,
  IsKeyedBinding,
  RequirementsOfBindings,
  ValidateBindingOperationNames,
} from './binding.js'
import type { DefaultViewOf } from './defaultView.js'
import type {
  AnyRoot,
  LocalMountsTypeId,
  RootChannelsOf,
} from './definition.js'
import type { IsConcreteOwner, Owner } from './owner.js'
import type { Qualify, Scoped } from './scope.js'

type AnyFunction = (...args: ReadonlyArray<any>) => any

type ReturnOf<Function extends AnyFunction> = Function extends (
  ...args: ReadonlyArray<never>
) => infer Output
  ? Output
  : never

type AnyHandler =
  | CommandHandler<any, any, any>
  | SubscriptionHandler<any, any, any>
  | MountHandler<any, any, any>
  | ManagedResourceHandler<any, any, any>

type IsAny<Value> = 0 extends 1 & Value ? true : false

type IsUnknown<Value> =
  IsAny<Value> extends true ? false : unknown extends Value ? true : false

type ErasedRequirement<Source extends string, Requirements> =
  IsAny<Requirements> extends true
    ? Source
    : IsUnknown<Requirements> extends true
      ? Source
      : never

/** @internal Extracts only Foldkit handler contracts from service evidence. */
export type HandlerRequirements<Requirements> =
  Requirements extends Scoped<infer _Path, infer Contract>
    ? Contract extends AnyHandler
      ? Requirements
      : never
    : Requirements extends AnyHandler
      ? Requirements
      : never

type HandlerName<Handler> =
  Handler extends CommandHandler<infer Name, any, any>
    ? Name
    : Handler extends SubscriptionHandler<infer Name, any, any>
      ? Name
      : Handler extends MountHandler<infer Name, any, any>
        ? Name
        : Handler extends ManagedResourceHandler<infer Name, any, any>
          ? Name
          : never

type HandlerKind<Handler> =
  Handler extends CommandHandler<any, any, any>
    ? 'Command'
    : Handler extends SubscriptionHandler<any, any, any>
      ? 'Subscription'
      : Handler extends MountHandler<any, any, any>
        ? 'Mount'
        : Handler extends ManagedResourceHandler<any, any, any>
          ? 'ManagedResource'
          : never

type HandlerIdentity<Requirement> =
  Requirement extends Scoped<infer Path, infer Contract>
    ? readonly [Path, HandlerKind<Contract>, HandlerName<Contract>]
    : readonly ['', HandlerKind<Requirement>, HandlerName<Requirement>]

type SatisfyRequirements<Requirements, Provided> = Requirements extends unknown
  ? [HandlerRequirements<Requirements>] extends [never]
    ? Exclude<Requirements, Provided>
    : HandlerIdentity<
          HandlerRequirements<Requirements>
        > extends HandlerIdentity<HandlerRequirements<Provided>>
      ? never
      : Requirements
  : never

type ChildHandlerEvidence<Children> = Children extends readonly []
  ? never
  : Children extends ReadonlyArray<infer Binding>
    ? HandlerRequirementsOfBinding<Binding>
    : unknown

type IsUnion<Value, Whole = Value> = Value extends unknown
  ? [Whole] extends [Value]
    ? false
    : true
  : never

type PreciseChildPlacement<Child> =
  Child extends Readonly<{
    placement: infer Placement extends string
  }>
    ? string extends Placement
      ? never
      : true extends IsUnion<Placement>
        ? never
        : Placement
    : never

type PreciseChildPlacements<Children extends ReadonlyArray<unknown>> = {
  [Index in keyof Children]: PreciseChildPlacement<Children[Index]>
}

type PlacementIndexes<Placements extends ReadonlyArray<string>> = {
  [
    Index in keyof Placements as Index extends `${number}`
      ? Placements[Index]
      : never
  ]: Index
}

type DuplicatePlacementKeys<Indexes> = {
  [Placement in keyof Indexes]: true extends IsUnion<Indexes[Placement]>
    ? Placement
    : never
}[keyof Indexes]

type DuplicatePrecisePlacements<Placements extends ReadonlyArray<string>> =
  Extract<DuplicatePlacementKeys<PlacementIndexes<Placements>>, string>

type ValidateProjectedChildPlacements<
  Placements extends ReadonlyArray<string>,
> = [DuplicatePrecisePlacements<Placements>] extends [
  infer Duplicate extends string,
]
  ? [Duplicate] extends [never]
    ? unknown
    : Readonly<{
        'Block sibling child placements must be unique': Duplicate
      }>
  : never

/** @internal Rejects precise child tuples whose resolved placements repeat. */
export type ValidateUniqueChildPlacements<
  Children extends ReadonlyArray<unknown>,
> = number extends Children['length']
  ? unknown
  : Children extends readonly [] | readonly [unknown]
    ? unknown
    : ValidateProjectedChildPlacements<PreciseChildPlacements<Children>>

/**
 * @internal Retains unresolved local and descendant handler contracts without
 * expanding operation or lifecycle requirements again at the application root.
 */
export type HandlerEvidence<EffectsLayer, HostDefinitions, Children> =
  | HandlerRequirements<
      | SatisfyRequirements<
          HandlerOfHostDefinition<
            HostDefinitions extends ReadonlyArray<infer Definition>
              ? Definition
              : never
          >,
          LayerOutputs<EffectsLayer>
        >
      | LayerInputs<EffectsLayer>
    >
  | ChildHandlerEvidence<Children>

/** @internal Reads the exact Layer recipe selected when a block was completed. */
export type EffectsLayerOfBlock<Block> = Block extends AnyRoot
  ? RootChannelsOf<Block>['EffectsLayer']
  : Block extends Readonly<{ EffectsLayer: infer LayerRecipe }>
    ? LayerRecipe
    : never

/** @internal Reads compact unresolved handler evidence from a block. */
export type HandlerEvidenceOfBlock<Block> = Block extends AnyRoot
  ? RootChannelsOf<Block>['handlerRequirements']
  : Block extends Readonly<{
        __blockHandlerRequirements: infer Evidence
      }>
    ? Evidence
    : unknown

/** @internal Reads exact host handler declarations retained by a block. */
export type HostHandlersOfBlock<Block> = Block extends AnyRoot
  ? RootChannelsOf<Block>['hostHandlers']
  : Block extends Readonly<{
        hostHandlers: infer HostHandlers extends ReadonlyArray<unknown>
      }>
    ? HostHandlers
    : readonly []

/** @internal Reads the exact default view retained by a completed block. */
export type DefaultViewEvidenceOfBlock<Block> = Block extends AnyRoot
  ? RootChannelsOf<Block>['defaultView']
  : DefaultViewOf<Block>

/** @internal Reads an OutMessage declaration hidden by terminal application roots. */
export type OutMessageOfBlock<Block> = Block extends AnyRoot
  ? Exclude<RootChannelsOf<Block>['outMessage'], undefined>
  : Block extends Readonly<{ OutMessage: infer OutMessage }>
    ? OutMessage
    : never

/** @internal Rejects application roots with unresolved handler contracts. */
export type ValidateRootHandlerAssembly<Block> =
  IsAny<HandlerEvidenceOfBlock<Block>> extends true
    ? Readonly<{
        'Application Block must provide every handler contract before completion': HandlerEvidenceOfBlock<Block>
      }>
    : IsUnknown<HandlerEvidenceOfBlock<Block>> extends true
      ? Readonly<{
          'Application Block must provide every handler contract before completion': HandlerEvidenceOfBlock<Block>
        }>
      : [HandlerEvidenceOfBlock<Block>] extends [never]
        ? unknown
        : Readonly<{
            'Application Block must provide every handler contract before completion': HandlerEvidenceOfBlock<Block>
          }>

/**
 * @internal Extracts Command requirements from producers and Step factories.
 */
export type ProducerRequirements<Producer> =
  IsAny<Producer> extends true
    ? Producer
    : Producer extends AnyFunction
      ? IsAny<ReturnOf<Producer>> extends true
        ? ReturnOf<Producer>
        : IsUnknown<ReturnOf<Producer>> extends true
          ? unknown
          : ReturnOf<Producer> extends AnyFunction
            ? ProducerRequirements<ReturnOf<Producer>>
            : Update.RequirementsOf<Producer>
      : never

type ProducerRegistrationEvidence<Producer> = Producer extends AnyFunction
  ? ReturnOf<Producer> extends AnyFunction
    ? ProducerRegistrationEvidence<ReturnOf<Producer>>
    : Update.RegistrationEvidenceOf<ReturnOf<Producer>>
  : never

/**
 * @internal Extracts requirements from a Subscription registry.
 */
export type SubscriptionRequirements<Subscriptions> =
  Subscriptions extends Readonly<Record<string, infer Subscription>>
    ? Subscription extends Readonly<{
        dependenciesToStream: (
          ...args: ReadonlyArray<any>
        ) => Stream.Stream<any, any, infer Requirements>
      }>
      ? Requirements
      : never
    : never

/**
 * @internal Extracts requirements from registered Mount definitions.
 */
export type MountRequirements<Mounts> =
  Mounts extends ReadonlyArray<infer Definition>
    ? Definition extends (...args: ReadonlyArray<never>) => infer Action
      ? Action extends MountAction<any, any, infer Requirements>
        ? Requirements
        : never
      : never
    : never

/**
 * @internal Extracts requirements used while acquiring or releasing resources.
 */
export type ManagedResourceLifecycleRequirements<ManagedResources> =
  ManagedResources extends Readonly<Record<string, infer Entry>>
    ?
        | (Entry extends Readonly<{
            acquire: (
              ...args: ReadonlyArray<any>
            ) => Effect.Effect<any, any, infer Requirements>
          }>
            ? Exclude<Requirements, Scope.Scope>
            : never)
        | (Entry extends Readonly<{
            release: (
              ...args: ReadonlyArray<any>
            ) => Effect.Effect<any, any, infer Requirements>
          }>
            ? Exclude<Requirements, Scope.Scope>
            : never)
    : never

/**
 * @internal Extracts services installed by registered ManagedResources.
 */
export type ManagedResourceRuntimeServices<ManagedResources> =
  ManagedResourceServicesOf<ManagedResources>

/**
 * @internal Extracts the services produced by a Layer recipe.
 */
export type LayerOutputs<LayerRecipe> = LayerRecipe extends Layer.Any
  ? Layer.Success<LayerRecipe>
  : never

/**
 * @internal Extracts the services needed to construct a Layer recipe.
 */
export type LayerInputs<LayerRecipe> = LayerRecipe extends Layer.Any
  ? Layer.Services<LayerRecipe>
  : never

type InvocationRequirements<Definition> = Definition extends (
  ...args: ReadonlyArray<never>
) => infer Invocation
  ?
      | (Invocation extends Readonly<{
          effect: Effect.Effect<any, any, infer Requirements>
        }>
          ? Requirements
          : never)
      | (Invocation extends MountAction<any, any, infer Requirements>
          ? Requirements
          : never)
  : never

type LifecycleRequirements<Definition> =
  | (Definition extends Readonly<{
      acquire: (
        ...args: ReadonlyArray<any>
      ) => Effect.Effect<any, any, infer Requirements>
    }>
      ? Exclude<Requirements, Scope.Scope>
      : never)
  | (Definition extends Readonly<{
      release: (
        ...args: ReadonlyArray<any>
      ) => Effect.Effect<any, any, infer Requirements>
    }>
      ? Exclude<Requirements, Scope.Scope>
      : never)

type HostDefinitionRequirements<Definition> =
  Definition extends Readonly<{ toLayer: AnyFunction }>
    ?
        | InvocationRequirements<Definition>
        | SubscriptionRequirements<Readonly<{ entry: Definition }>>
        | LifecycleRequirements<Definition>
    : never

/**
 * @internal Extracts the exact handler contract declared by a host entry.
 */
export type HandlerOfHostDefinition<Definition> = HandlerRequirements<
  HostDefinitionRequirements<Definition>
>

type HostDefinitions<Block> = HostHandlersOfBlock<Block>[number]

type DeclaredHostHandlers<Block> = HandlerOfHostDefinition<
  HostDefinitions<Block>
>

type BlockLayer<Block> = EffectsLayerOfBlock<Block>

type BlockManagedResources<Block> =
  Block extends Readonly<{ managedResources: infer ManagedResources }>
    ? ManagedResources
    : Readonly<Record<never, never>>

type BindingRuntimeServices<Binding> =
  Binding extends Readonly<{ placement: infer Placement extends string }>
    ? IsKeyedBinding<Binding> extends true
      ? Qualify<Placement, RuntimeServicesOfBlock<BlockOfBinding<Binding>>>
      : Qualify<Placement, ChildRuntimeServices<BlockOfBinding<Binding>>>
    : never

type ChildRuntimeServices<Block> =
  Block extends Readonly<{
    bindings: ReadonlyArray<infer Binding>
  }>
    ? BindingRuntimeServices<Binding>
    : never

type RuntimeServicesOfBlockMember<Block> = Block extends AnyRoot
  ? RootChannelsOf<Block>['runtimeServices']
  :
      | ManagedResourceRuntimeServices<BlockManagedResources<Block>>
      | ChildRuntimeServices<Block>

type BlocksMissingRuntimeService<Block, Service> = Block extends unknown
  ? [Service] extends [RuntimeServicesOfBlockMember<Block>]
    ? never
    : Block
  : never

type RuntimeServiceProvidedByEveryBlock<Block, Service> =
  Service extends unknown
    ? [BlocksMissingRuntimeService<Block, Service>] extends [never]
      ? Service
      : never
    : never

/**
 * @internal Extracts ManagedResource services installed by every alternative
 * of a block graph, retaining complete keyed child placement capabilities.
 */
export type RuntimeServicesOfBlock<Block> = RuntimeServiceProvidedByEveryBlock<
  Block,
  RuntimeServicesOfBlockMember<Block>
>

type BlockLocalMounts<Block> =
  Block extends Readonly<{ [LocalMountsTypeId]: infer Mounts }>
    ? Mounts
    : Block extends Readonly<{ mounts: infer Mounts }>
      ? Mounts
      : readonly []

type LocalOperationRequirements<Block> =
  | (Block extends Readonly<{ init: infer Init }>
      ? ProducerRequirements<Init>
      : never)
  | (Block extends Readonly<{ update: infer UpdateFunction }>
      ? ProducerRequirements<UpdateFunction>
      : never)
  | (Block extends Readonly<{ subscriptions: infer Subscriptions }>
      ? SubscriptionRequirements<Subscriptions>
      : never)
  | ManagedResourceLifecycleRequirements<BlockManagedResources<Block>>
  | MountRequirements<BlockLocalMounts<Block>>

type BindingInheritedRequirements<Binding> = Binding extends unknown
  ? Binding extends Readonly<{ placement: infer Placement extends string }>
    ? Qualify<Placement, RequirementsOfBlock<BlockOfBinding<Binding>>>
    : RequirementsOfBlock<BlockOfBinding<Binding>>
  : never

type BindingDefinitionOperationRequirements<Binding> = Binding extends unknown
  ? Binding extends Readonly<{ placement: infer Placement extends string }>
    ? Qualify<Placement, OperationRequirementsOfBlock<BlockOfBinding<Binding>>>
    : OperationRequirementsOfBlock<BlockOfBinding<Binding>>
  : never

type BindingOwnOperationRequirements<Binding> =
  | (Binding extends Readonly<{ fold: infer Fold }>
      ? ProducerRequirements<Fold>
      : never)
  | SubscriptionRequirements<
      InspectionOfBinding<Binding> extends Readonly<{
        subscriptions: infer Subscriptions
      }>
        ? Subscriptions
        : never
    >
  | ManagedResourceLifecycleRequirements<
      InspectionOfBinding<Binding> extends Readonly<{
        managedResources: infer ManagedResources
      }>
        ? ManagedResources
        : never
    >

type ChildInheritedRequirements<Block> =
  Block extends Readonly<{
    bindings: ReadonlyArray<infer Binding>
  }>
    ? BindingInheritedRequirements<Binding>
    : never

type ChildOwnOperationRequirements<Block> =
  Block extends Readonly<{
    bindings: ReadonlyArray<infer Binding>
  }>
    ? BindingOwnOperationRequirements<Binding>
    : never

type ChildOperationRequirements<Block> =
  Block extends Readonly<{
    bindings: ReadonlyArray<infer Binding>
  }>
    ?
        | BindingDefinitionOperationRequirements<Binding>
        | BindingOwnOperationRequirements<Binding>
    : never

/**
 * @internal The unchanged services used by a block's operations and the
 * operations of its owned child bindings. Selected Layers and runtime-managed
 * handles do not alter this contract.
 */
export type OperationRequirementsOfBlock<Block> = Block extends AnyRoot
  ? RootChannelsOf<Block>['operationRequirements']
  : LocalOperationRequirements<Block> | ChildOperationRequirements<Block>

type CompletionOperationRequirements<Block> =
  | LocalOperationRequirements<Block>
  | ChildOwnOperationRequirements<Block>

type ResidualRequirements<Block> =
  | SatisfyRequirements<
      | Exclude<
          CompletionOperationRequirements<Block>,
          RuntimeServicesOfBlock<Block>
        >
      | ChildInheritedRequirements<Block>,
      LayerOutputs<BlockLayer<Block>>
    >
  | Exclude<LayerInputs<BlockLayer<Block>>, RuntimeServicesOfBlock<Block>>

/**
 * @internal The services a composed Block carries to its parent or root.
 * Registered ManagedResource handles satisfy operation and Layer construction
 * requirements after startup. The selected Layer graph satisfies matching
 * operation services; unrelated Layer construction inputs remain requirements.
 */
export type RequirementsOfBlock<Block> = Block extends AnyRoot
  ? RootChannelsOf<Block>['requirements']
  : ResidualRequirements<Block>

type RootPrecisionFailures<Block extends AnyRoot> =
  | ErasedRequirement<
      'root operation requirements',
      RootChannelsOf<Block>['operationRequirements']
    >
  | ErasedRequirement<
      'root residual requirements',
      RootChannelsOf<Block>['requirements']
    >
  | ErasedRequirement<
      'root runtime services',
      RootChannelsOf<Block>['runtimeServices']
    >
  | ErasedRequirement<
      'root handler requirements',
      RootChannelsOf<Block>['handlerRequirements']
    >
  | ErasedRequirement<
      'root operation registrations',
      RootChannelsOf<Block>['registrationEvidence']
    >
  | ErasedRequirement<
      'root registered child evidence',
      RootChannelsOf<Block>['registeredChildEvidence']
    >
  | ErasedRequirement<
      'root EffectsLayer outputs',
      LayerOutputs<RootChannelsOf<Block>['EffectsLayer']>
    >
  | ErasedRequirement<
      'root EffectsLayer inputs',
      LayerInputs<RootChannelsOf<Block>['EffectsLayer']>
    >
  | ErasedRequirement<
      'root EffectsLayer errors',
      Layer.Error<RootChannelsOf<Block>['EffectsLayer']>
    >

type ValidateOneRootRequirementEvidence<Block extends AnyRoot> = [
  RootChannelsOf<Block>,
] extends [never]
  ? Readonly<{ 'Application root must retain exact assembly channels': Block }>
  : ([RootPrecisionFailures<Block>] extends [never]
      ? unknown
      : Readonly<{
          'Application root channels must preserve exact types': RootPrecisionFailures<Block>
        }>) &
      ([
        Exclude<
          RootChannelsOf<Block>['registrationEvidence'],
          RootChannelsOf<Block>['registeredChildEvidence']
        >,
      ] extends [never]
        ? unknown
        : Readonly<{
            'Block operations may use only registered child bindings': Exclude<
              RootChannelsOf<Block>['registrationEvidence'],
              RootChannelsOf<Block>['registeredChildEvidence']
            >
          }>) &
      (IsAny<
        RootChannelsOf<Block>['concreteCompositionValidation']
      > extends true
        ? Readonly<{
            'Application root must retain concrete composition validation': Block
          }>
        : [RootChannelsOf<Block>['concreteCompositionValidation']] extends [
              never,
            ]
          ? Readonly<{
              'Application root must retain concrete composition validation': Block
            }>
          : RootChannelsOf<Block>['concreteCompositionValidation'])

type RootRequirementEvidenceFailures<Block> = Block extends AnyRoot
  ? unknown extends ValidateOneRootRequirementEvidence<Block>
    ? never
    : ValidateOneRootRequirementEvidence<Block>
  : never

/** @internal Checks captured raw registrations and concrete root validation. */
export type ValidateRootRequirementEvidence<Block> = [
  RootRequirementEvidenceFailures<Block>,
] extends [never]
  ? unknown
  : RootRequirementEvidenceFailures<Block>

type ResidualHandlers<Block> = HandlerRequirements<ResidualRequirements<Block>>

type DeclaredBindingHostHandlers<Binding> =
  Binding extends Readonly<{ placement: infer Placement extends string }>
    ? Qualify<Placement, DeclaredHostHandlers<BlockOfBinding<Binding>>>
    : never

type DeclaredChildHostHandlers<Block> =
  Block extends Readonly<{ bindings: ReadonlyArray<infer Binding> }>
    ? DeclaredBindingHostHandlers<Binding>
    : never

type MissingHostHandlers<Block> = Exclude<
  ResidualHandlers<Block>,
  DeclaredHostHandlers<Block> | DeclaredChildHostHandlers<Block>
>

type UnexpectedHostHandlers<Block> = Exclude<
  DeclaredHostHandlers<Block>,
  ResidualHandlers<Block>
>

type InvalidHostDefinitions<Block> =
  HostDefinitions<Block> extends infer Definition
    ? Definition extends unknown
      ? [HandlerOfHostDefinition<Definition>] extends [never]
        ? Definition
        : never
      : never
    : never

type PrecisionFailures<Block> =
  | ErasedRequirement<
      'init, update, or exposed operations',
      Block extends Readonly<{ init: infer Init }>
        ? ProducerRequirements<Init>
        : never
    >
  | ErasedRequirement<
      'init, update, or exposed operations',
      Block extends Readonly<{ update: infer UpdateFunction }>
        ? ProducerRequirements<UpdateFunction>
        : never
    >
  | ErasedRequirement<
      'subscriptions',
      Block extends Readonly<{ subscriptions: infer Subscriptions }>
        ? SubscriptionRequirements<Subscriptions>
        : never
    >
  | ErasedRequirement<
      'managed resources',
      | ManagedResourceLifecycleRequirements<BlockManagedResources<Block>>
      | ManagedResourceRuntimeServices<BlockManagedResources<Block>>
    >
  | ErasedRequirement<'mounts', MountRequirements<BlockLocalMounts<Block>>>
  | ErasedRequirement<'EffectsLayer outputs', LayerOutputs<BlockLayer<Block>>>
  | ErasedRequirement<'EffectsLayer inputs', LayerInputs<BlockLayer<Block>>>
  | ErasedRequirement<'hostHandlers', DeclaredHostHandlers<Block>>

type ValidatePreciseRequirements<Block> = [PrecisionFailures<Block>] extends [
  never,
]
  ? unknown
  : Readonly<{
      'Block requirement sources must preserve exact service types': PrecisionFailures<Block>
    }>

type ValidateHostDefinitions<Block> = [InvalidHostDefinitions<Block>] extends [
  never,
]
  ? unknown
  : Readonly<{
      'Block hostHandlers must contain layered Foldkit definitions': InvalidHostDefinitions<Block>
    }>

type ValidateMissingHostHandlers<Block> = [MissingHostHandlers<Block>] extends [
  never,
]
  ? unknown
  : Readonly<{
      'Block handler requirements must be provided locally or listed in hostHandlers': MissingHostHandlers<Block>
    }>

type ValidateUnexpectedHostHandlers<Block> = [
  UnexpectedHostHandlers<Block>,
] extends [never]
  ? unknown
  : Readonly<{
      'Block hostHandlers must match residual handler requirements': UnexpectedHostHandlers<Block>
    }>

type ValidateBlockOperationNames<Block> =
  Block extends Readonly<{ operations: infer Operations }>
    ? ValidateBindingOperationNames<Operations>
    : unknown

type LocalOperationRegistrationEvidence<Block> =
  | (Block extends Readonly<{ init: infer Init }>
      ? ProducerRegistrationEvidence<Init>
      : never)
  | (Block extends Readonly<{ update: infer UpdateFunction }>
      ? ProducerRegistrationEvidence<UpdateFunction>
      : never)

type RegisteredChildEvidence<Block> =
  Block extends Readonly<{
    bindings: infer Children extends ReadonlyArray<unknown>
  }>
    ? RequirementsOfBindings<Children>
    : never

type MissingOperationRegistrations<Block> = Exclude<
  LocalOperationRegistrationEvidence<Block>,
  RegisteredChildEvidence<Block>
>

type ValidateOperationRegistrations<Block> = [
  MissingOperationRegistrations<Block>,
] extends [never]
  ? unknown
  : Readonly<{
      'Block operations may use only registered child bindings': MissingOperationRegistrations<Block>
    }>

type ValidateFullComposition<Composition> =
  ValidateBlockOperationNames<Composition> &
    ValidateOperationRegistrations<Composition> &
    ValidatePreciseRequirements<Composition> &
    ValidateHostDefinitions<Composition> &
    ValidateMissingHostHandlers<Composition> &
    ValidateUnexpectedHostHandlers<Composition> &
    ValidHandlerContracts<HandlerContracts<Composition>>

type SatisfyLocalRequirements<Requirements, Provided> =
  Requirements extends Scoped<any, any>
    ? Exclude<Requirements, Provided>
    : SatisfyRequirements<Requirements, Provided>

type CompositionChildHandlerEvidence<Composition> =
  Composition extends Readonly<{ bindings: infer Children }>
    ? ChildHandlerEvidence<Children>
    : never

type UnscopedHandlerRequirements<Requirements> =
  Requirements extends Scoped<any, any>
    ? never
    : HandlerRequirements<Requirements>

interface LocalCompositionChannelsShape {
  readonly initRequirements: unknown
  readonly updateRequirements: unknown
  readonly subscriptionRequirements: unknown
  readonly managedResourceRequirements: unknown
  readonly managedResourceServices: unknown
  readonly mountRequirements: unknown
  readonly layerOutputs: unknown
  readonly layerInputs: unknown
  readonly hostDefinitions: unknown
  readonly childHandlerEvidence: unknown
  readonly registrationEvidence: unknown
  readonly registeredChildEvidence: unknown
}

type CompleteLocalComposition = Readonly<{
  [LocalMountsTypeId]: unknown
  bindings: ReadonlyArray<unknown>
  init: unknown
  update: unknown
  subscriptions: unknown
  managedResources: unknown
  EffectsLayer: unknown
  hostHandlers: ReadonlyArray<unknown>
}>

type HasCompleteLocalCompositionShape<Composition> =
  IsAny<Composition> extends true
    ? false
    : [Composition] extends [never]
      ? false
      : IsUnknown<Composition> extends true
        ? false
        : [Composition] extends [CompleteLocalComposition]
          ? true
          : false

type FastLocalCompositionChannels<Composition> = [Composition] extends [
  Readonly<{
    [LocalMountsTypeId]: infer Mounts
    bindings: infer Children extends ReadonlyArray<unknown>
    init: infer Init
    update: infer UpdateFunction
    subscriptions: infer Subscriptions
    managedResources: infer ManagedResources
    EffectsLayer: infer EffectsLayer
    hostHandlers: infer HostHandlers extends ReadonlyArray<unknown>
  }>,
]
  ? Readonly<{
      initRequirements: ProducerRequirements<Init>
      updateRequirements: ProducerRequirements<UpdateFunction>
      subscriptionRequirements: SubscriptionRequirements<Subscriptions>
      managedResourceRequirements: ManagedResourceLifecycleRequirements<ManagedResources>
      managedResourceServices: ManagedResourceRuntimeServices<ManagedResources>
      mountRequirements: MountRequirements<Mounts>
      layerOutputs: LayerOutputs<EffectsLayer>
      layerInputs: LayerInputs<EffectsLayer>
      hostDefinitions: HostHandlers[number]
      childHandlerEvidence: ChildHandlerEvidence<Children>
      registrationEvidence:
        | ProducerRegistrationEvidence<Init>
        | ProducerRegistrationEvidence<UpdateFunction>
      registeredChildEvidence: RequirementsOfBindings<Children>
    }>
  : never

type FallbackLocalCompositionChannels<Composition> = Readonly<{
  initRequirements: Composition extends Readonly<{ init: infer Init }>
    ? ProducerRequirements<Init>
    : never
  updateRequirements: Composition extends Readonly<{
    update: infer UpdateFunction
  }>
    ? ProducerRequirements<UpdateFunction>
    : never
  subscriptionRequirements: Composition extends Readonly<{
    subscriptions: infer Subscriptions
  }>
    ? SubscriptionRequirements<Subscriptions>
    : never
  managedResourceRequirements: ManagedResourceLifecycleRequirements<
    BlockManagedResources<Composition>
  >
  managedResourceServices: ManagedResourceRuntimeServices<
    BlockManagedResources<Composition>
  >
  mountRequirements: MountRequirements<BlockLocalMounts<Composition>>
  layerOutputs: LayerOutputs<BlockLayer<Composition>>
  layerInputs: LayerInputs<BlockLayer<Composition>>
  hostDefinitions: HostDefinitions<Composition>
  childHandlerEvidence: CompositionChildHandlerEvidence<Composition>
  registrationEvidence: LocalOperationRegistrationEvidence<Composition>
  registeredChildEvidence: RegisteredChildEvidence<Composition>
}>

type LocalCompositionChannels<Composition> =
  HasCompleteLocalCompositionShape<Composition> extends true
    ? FastLocalCompositionChannels<Composition>
    : FallbackLocalCompositionChannels<Composition>

type ValidateLocalCompositionChannels<
  Composition,
  Channels extends LocalCompositionChannelsShape,
  LocalRequirements =
    | Channels['initRequirements']
    | Channels['updateRequirements']
    | Channels['subscriptionRequirements']
    | Channels['managedResourceRequirements']
    | Channels['mountRequirements'],
  DeclaredHostHandlersValue = HandlerOfHostDefinition<
    Channels['hostDefinitions']
  >,
  LocalResidual =
    | SatisfyLocalRequirements<
        Exclude<LocalRequirements, Channels['managedResourceServices']>,
        Channels['layerOutputs']
      >
    | Exclude<Channels['layerInputs'], Channels['managedResourceServices']>,
  ResidualHandlers = HandlerRequirements<LocalResidual>,
  PrecisionFailure =
    | ErasedRequirement<
        'init, update, or exposed operations',
        Channels['initRequirements']
      >
    | ErasedRequirement<
        'init, update, or exposed operations',
        Channels['updateRequirements']
      >
    | ErasedRequirement<'subscriptions', Channels['subscriptionRequirements']>
    | ErasedRequirement<
        'managed resources',
        | Channels['managedResourceRequirements']
        | Channels['managedResourceServices']
      >
    | ErasedRequirement<'mounts', Channels['mountRequirements']>
    | ErasedRequirement<'EffectsLayer outputs', Channels['layerOutputs']>
    | ErasedRequirement<'EffectsLayer inputs', Channels['layerInputs']>
    | ErasedRequirement<'hostHandlers', DeclaredHostHandlersValue>,
  InvalidHostDefinition = Channels['hostDefinitions'] extends infer Definition
    ? Definition extends unknown
      ? [HandlerOfHostDefinition<Definition>] extends [never]
        ? Definition
        : never
      : never
    : never,
  MissingRegistration = Exclude<
    Channels['registrationEvidence'],
    Channels['registeredChildEvidence']
  >,
  MissingHostHandler = Exclude<
    ResidualHandlers,
    DeclaredHostHandlersValue | Channels['childHandlerEvidence']
  >,
  UnexpectedHostHandler = Exclude<DeclaredHostHandlersValue, ResidualHandlers>,
  HandlerContract =
    | UnscopedHandlerRequirements<LocalRequirements>
    | HandlerRequirements<
        | Channels['layerOutputs']
        | Channels['layerInputs']
        | DeclaredHostHandlersValue
      >,
> = ValidateBlockOperationNames<Composition> &
  ([MissingRegistration] extends [never]
    ? unknown
    : Readonly<{
        'Block operations may use only registered child bindings': MissingRegistration
      }>) &
  ([PrecisionFailure] extends [never]
    ? unknown
    : Readonly<{
        'Block requirement sources must preserve exact service types': PrecisionFailure
      }>) &
  ([InvalidHostDefinition] extends [never]
    ? unknown
    : Readonly<{
        'Block hostHandlers must contain layered Foldkit definitions': InvalidHostDefinition
      }>) &
  ([MissingHostHandler] extends [never]
    ? unknown
    : Readonly<{
        'Block handler requirements must be provided locally or listed in hostHandlers': MissingHostHandler
      }>) &
  ([UnexpectedHostHandler] extends [never]
    ? unknown
    : Readonly<{
        'Block hostHandlers must match residual handler requirements': UnexpectedHostHandler
      }>) &
  ValidHandlerContracts<HandlerContract>

type ValidateLocalComposition<Composition> = ValidateLocalCompositionChannels<
  Composition,
  LocalCompositionChannels<Composition>
>

type HandlerContracts<Block> = HandlerRequirements<
  | OperationRequirementsOfBlock<Block>
  | LayerOutputs<BlockLayer<Block>>
  | LayerInputs<BlockLayer<Block>>
  | DeclaredHostHandlers<Block>
>

/** Validates composition details that remain deferred until a generic Block
 * factory produces a concrete completed Block. */
export type ValidateConcreteComposition<
  Composition extends Readonly<{ owner: Owner<string> }>,
> =
  Composition['owner'] extends Owner<string, true>
    ? unknown
    : Composition['owner'] extends Owner<string, false>
      ? ValidateFullComposition<Composition>
      : unknown

type ValidateDefinitionComposition<Definition, Composition> =
  Definition extends Readonly<{
    owner: infer OwnerValue
  }>
    ? IsConcreteOwner<OwnerValue> extends true
      ? ValidateFullComposition<Composition>
      : ValidateHostDefinitions<Composition>
    : ValidateFullComposition<Composition>

/**
 * @internal Validates handler completeness and exact service inference.
 */
export type ValidateComposition<Definition, Composition> =
  ValidateDefinitionComposition<Definition, Composition>

type ValidateDefinitionImplementation<Definition, Composition> =
  Definition extends Readonly<{ owner: infer OwnerValue }>
    ? IsConcreteOwner<OwnerValue> extends true
      ? ValidateLocalComposition<Composition>
      : ValidateHostDefinitions<Composition>
    : ValidateLocalComposition<Composition>

/**
 * @internal Validates implementation-owned channels after child bindings have
 * already validated their block graphs.
 */
export type ValidateImplementationComposition<Definition, Composition> =
  ValidateDefinitionImplementation<Definition, Composition>
