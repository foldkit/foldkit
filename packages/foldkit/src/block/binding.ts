import { Context, Layer, Option, Predicate, Record, Schema } from 'effect'

import { type Command, mapMessages } from '../command/index.js'
import type {
  AnyBlockView,
  BoundBlockConfig,
  BoundBlockFields,
  BoundBlockView,
  ViewMountRequirementsOf,
} from '../html/block.js'
import * as ManagedResource from '../managedResource/index.js'
import type {
  AnyHandler as AnyMountHandler,
  LayeredMountDefinition,
  RequirementsOf as MountRequirementsOf,
} from '../mount/index.js'
import * as Subscription from '../subscription/subscription.js'
import * as Update from '../update/index.js'
import {
  makeResultRecipe,
  resolveOperationOutput,
} from '../update/operationRecipe.js'
import type { CompletionProof } from './assemblyState.js'
import {
  assertInitializedParentModel,
  registerBinding,
  runtimeBindingOf,
  runtimeBindingsOf,
} from './composition.js'
import { type DefaultViewTypeId, defaultViewOf } from './defaultView.js'
import type { DeferredBindingPolicy } from './deferredPolicy.js'
import {
  type BindingDeliveryEvidence,
  type BindingMessagePolicy,
  type RuntimeFromParentMessage,
  type WithoutBindingDeliveryEvidence,
  registerBindingDelivery,
  trackParentMessageMapper,
} from './delivery.js'
import type { DirectConnection } from './directConnection.js'
import {
  type DefinitionIdentity,
  LocalMountsTypeId,
  ViewScopeTypeId,
  copyIdentity,
  hostIdentitiesOf,
} from './identity.js'
import { type BindingInitRecipe, makeBindingInitRecipe } from './initRecipe.js'
import type { InstanceFrame } from './instanceContext.js'
import type { IsSilentOperation } from './operationEmission.js'
import {
  assertRegisteredBinding,
  assertRegisteredInitialization,
  isRegisteredBinding,
  withOperationGraph,
} from './operationGraph.js'
import type { Owner } from './owner.js'
import type { BindingPolicyEvidence } from './policyEvidence.js'
import type {
  HandlerEvidenceOfBlock,
  ValidateConcreteComposition,
} from './requirements.js'
import {
  type Qualify,
  type QualifyOwned,
  assertSegment,
  qualifyCommand,
  qualifyEffect,
  qualifyEntry,
  qualifyKey,
  qualifyLayer,
  qualifyStream,
} from './scope.js'

export type { LocalMountsTypeId } from './definition.js'

/**
 * @inline
 */
type AnyFunction = (...args: ReadonlyArray<any>) => any

type IsAny<Value> = 0 extends 1 & Value ? true : false

type IsUnknown<Value> =
  IsAny<Value> extends true ? false : unknown extends Value ? true : false

type ReturnOf<Value> = Value extends (
  ...args: ReadonlyArray<never>
) => infer Output
  ? Output
  : never

type AnyUpdateReturn = Readonly<{
  model: any
  commands?: ReadonlyArray<Command<any, never, any>> | undefined
  outMessage?: any
}>

type AnyProducer = (model: any, ...args: ReadonlyArray<any>) => AnyUpdateReturn

type CommandRequirementsOf<Commands> = [NonNullable<Commands>] extends [never]
  ? never
  : NonNullable<Commands> extends ReadonlyArray<infer CommandValue>
    ? [CommandValue] extends [never]
      ? never
      : CommandValue extends Command<any, any, infer Requirements>
        ? Requirements
        : never
    : never

type CommandMessageOfCommands<Commands> =
  Commands extends ReadonlyArray<infer CommandValue>
    ? CommandValue extends Command<infer Message, any, any>
      ? Message
      : never
    : never

type MessageOfInitializerSource<Source> =
  Source extends Readonly<{
    Type: infer Message
  }>
    ? Message
    : Source

type InvalidParentCommandMessages = Readonly<{
  'Binding init commands must produce only the parent Message': never
}>

type ValidateParentCommandMessages<Commands, ParentMessage> = [
  CommandMessageOfCommands<NonNullable<Commands>>,
] extends [never]
  ? unknown
  : IsAny<CommandMessageOfCommands<NonNullable<Commands>>> extends true
    ? InvalidParentCommandMessages
    : IsUnknown<CommandMessageOfCommands<NonNullable<Commands>>> extends true
      ? InvalidParentCommandMessages
      : [CommandMessageOfCommands<NonNullable<Commands>>] extends [
            ParentMessage,
          ]
        ? unknown
        : InvalidParentCommandMessages

type ValidateConcreteParentCommands<Commands> =
  IsAny<Commands> extends true
    ? Readonly<{
        'Binding init commands must preserve concrete Command requirements and registrations': never
      }>
    : [NonNullable<Commands>] extends [never]
      ? unknown
      : NonNullable<Commands> extends ReadonlyArray<infer CommandValue>
        ? true extends
            | IsAny<CommandValue>
            | IsAny<CommandRequirementsOf<Commands>>
            | IsUnknown<CommandRequirementsOf<Commands>>
            | IsAny<
                Update.RegistrationEvidenceOf<Readonly<{ commands: Commands }>>
              >
            | IsUnknown<
                Update.RegistrationEvidenceOf<Readonly<{ commands: Commands }>>
              >
          ? Readonly<{
              'Binding init commands must preserve concrete Command requirements and registrations': never
            }>
          : unknown
        : Readonly<{
            'Binding init commands must be a concrete Commands collection': never
          }>

type ValidateConcreteInitializedModel<Model> =
  IsAny<Model> extends true
    ? Readonly<{
        'Binding init toParentModel must return a concrete parent Model': never
      }>
    : unknown

/** @internal Carries Binding evidence without adding string members. */
declare const ConnectionEvidenceTypeId: unique symbol
declare const ParentBindingContractTypeId: unique symbol

/** Lifecycle registrations and Layer recipe retained by a Binding for
 * composition and tooling. */
export type BindingInspection<
  Subscriptions,
  ManagedResources,
  Mounts,
  EffectsLayer,
> = Readonly<{
  /** Child Subscriptions lifted into the parent Model and Message context. */
  subscriptions: Subscriptions
  /** Child ManagedResources lifted into the parent Model and Message context. */
  managedResources: ManagedResources
  /** Mount definitions available to views that embed this Binding. */
  mounts: Mounts
  /** The child's local and descendant handler recipes qualified by placement. */
  EffectsLayer: EffectsLayer
}>

/** @internal Exact Binding evidence used by composition validation. */
export type ConnectionEvidence<
  BlockValue,
  HandlerRequirements,
  Inspection,
  IsKeyed extends boolean,
> = Readonly<{
  block: BlockValue
  handlerRequirements: HandlerRequirements
  inspection: Inspection
  isKeyed: IsKeyed
}>

/** @internal Associates exact evidence through a module-private property key. */
export interface BindingEvidence<
  BlockValue,
  HandlerRequirements,
  Inspection,
  IsKeyed extends boolean,
> {
  readonly [ConnectionEvidenceTypeId]: ConnectionEvidence<
    BlockValue,
    HandlerRequirements,
    Inspection,
    IsKeyed
  >
}

/** @internal Retains the established parent contracts on parent-owned Bindings. */
export interface ParentBindingContract<
  ParentModel,
  ParentMessage,
  ParentOutMessage,
> {
  readonly [ParentBindingContractTypeId]: Readonly<{
    model: ParentModel
    message: ParentMessage
    outMessage: ParentOutMessage
  }>
}

declare const BindingStorageEvidenceTypeId: unique symbol

/** @internal Retains only the declared storage relationship of a parent-owned Binding. */
export interface BindingStorageEvidence<Storage> {
  readonly [BindingStorageEvidenceTypeId]: Storage
}

/** @internal Recovers a Binding's declared storage relationship. */
export type StorageOfBinding<BindingValue> =
  BindingValue extends Readonly<{
    [BindingStorageEvidenceTypeId]: infer Storage
  }>
    ? Storage
    : never

type OptionalParentBindingContract<
  ParentModel,
  ParentMessage,
  ParentOutMessage,
> = [ParentModel] extends [never]
  ? unknown
  : ParentBindingContract<ParentModel, ParentMessage, ParentOutMessage>

/** @internal Recovers the established parent contracts from a Binding. */
export type ParentContractOfBinding<BindingValue> =
  BindingValue extends Readonly<{
    [ParentBindingContractTypeId]: infer Contract
  }>
    ? Contract
    : never

/** The metadata returned by {@link inspectBinding}. */
export type InspectionOfBinding<BindingValue> =
  BindingValue extends Readonly<{
    [ConnectionEvidenceTypeId]: Readonly<{ inspection: infer Inspection }>
  }>
    ? Inspection
    : never

type ReservedBindingMember =
  | 'placement'
  | 'init'
  | 'fold'
  | 'embedView'
  | 'withOutMessagePolicy'

/** @internal Rejects exposed operation names that overwrite Binding members. */
export type ValidateBindingOperationNames<Operations> = [
  Extract<keyof Operations, ReservedBindingMember>,
] extends [never]
  ? unknown
  : Readonly<{
      'Block exposed operation names must not collide with Binding members': Extract<
        keyof Operations,
        ReservedBindingMember
      >
    }>

const reservedBindingMembers = new Set<string>([
  'placement',
  'init',
  'fold',
  'embedView',
  'withOutMessagePolicy',
])

type RuntimeBindingInitConfig = Readonly<{
  args: ReadonlyArray<unknown>
  toParentModel: (childModel: unknown) => unknown
  commands?: ReadonlyArray<unknown> | undefined
}>

const assertBindingInitConfig: (
  value: unknown,
  placement: string,
) => asserts value is RuntimeBindingInitConfig = (value, placement) => {
  if (!Predicate.isObject(value)) {
    throw new Error(
      `[foldkit] Child Binding "${placement}" init requires a configuration object with args and toParentModel.`,
    )
  }
  if (!globalThis.Array.isArray(Reflect.get(value, 'args'))) {
    throw new Error(
      `[foldkit] Child Binding "${placement}" init.args must be an argument tuple.`,
    )
  }
  if (!Predicate.isFunction(Reflect.get(value, 'toParentModel'))) {
    throw new Error(
      `[foldkit] Child Binding "${placement}" init.toParentModel must be a function that stores the initialized child in the parent Model.`,
    )
  }
  const commands = Reflect.get(value, 'commands')
  if (commands !== undefined && !globalThis.Array.isArray(commands)) {
    throw new Error(
      `[foldkit] Child Binding "${placement}" init.commands must be a Commands collection when provided.`,
    )
  }
}

/** @internal Guards JavaScript callers and erased Block values at runtime. */
export const assertValidBindingOperationNames = (
  operations: Readonly<Record<string, unknown>>,
): void => {
  for (const name of Object.keys(operations)) {
    if (reservedBindingMembers.has(name)) {
      throw new Error(
        `[foldkit] Block exposed operation name "${name}" collides with a Binding member.`,
      )
    }
  }
}

/**
 * Structural portion of a complete Block accepted by `Definition.makeBinding`.
 * It preserves every channel collected by parents without introducing a
 * recursive complete Block constraint.
 */
export type BindableBlock = CompletionProof &
  Readonly<{
    owner: Owner<any>
    Model: Readonly<{ Type: any }>
    Message: Readonly<{ Type: any }>
    OutMessage?: Readonly<{ Type: any }>
    mounts: ReadonlyArray<LayeredMountDefinition>
    [LocalMountsTypeId]: ReadonlyArray<LayeredMountDefinition>
    bindings: ReadonlyArray<AnyBinding>
    init: AnyFunction
    update: AnyFunction
    operations: Readonly<Record<string, AnyFunction>>
    subscriptions: Subscription.Subscriptions<any, any, any>
    managedResources: Readonly<
      Record<
        string,
        ManagedResource.Entry<any, any, any, any, any, any, any, any>
      >
    >
    EffectsLayer: Layer.Any
    __blockHandlerRequirements?: unknown
    hostHandlers: ReadonlyArray<unknown>
  }>

type DefinitionLocalMounts<BlockValue> =
  BlockValue extends Readonly<{ [LocalMountsTypeId]: infer Mounts }>
    ? Mounts
    : BlockValue extends Readonly<{ mounts: infer Mounts }>
      ? Mounts
      : readonly []

type DefinitionViewMountRequirements<BlockValue> =
  | MountRequirementsOf<DefinitionLocalMounts<BlockValue>>
  | (BlockValue extends Readonly<{
      bindings: infer Children extends ReadonlyArray<AnyBinding>
    }>
      ? RequirementsOfBindings<Children>
      : never)

/** Validates that an alternate embedded view uses only Mount and child
 * capabilities registered by its Block's Composition. */
export type ValidateEmbeddedViewMounts<
  BlockValue,
  View extends AnyBlockView,
> = [
  Exclude<
    ViewMountRequirementsOf<View>,
    DefinitionViewMountRequirements<BlockValue>
  >,
] extends [never]
  ? unknown
  : never

type BlockUpdate<BlockValue extends Readonly<{ update: AnyFunction }>> =
  BlockValue['update']

type BlockModel<BlockValue extends BindableBlock> = Parameters<
  BlockUpdate<BlockValue>
>[0]

type BlockMessage<
  BlockValue extends Readonly<{ Message: Readonly<{ Type: any }> }>,
> = BlockValue['Message']['Type']

/** Defines how a parent handles every OutMessage from a bound child. */
export type OutMessagePolicy<
  ParentModel,
  ChildMessage,
  ParentMessage,
  ChildOutMessage,
> =
  | Readonly<{
      /** Handles each child OutMessage in the parent. The returned Step receives
       * the parent Model after Foldkit has written the next child Model. */
      fold: (
        outMessage: ChildOutMessage,
        context: Update.FoldContext<ChildMessage, ParentMessage, ParentModel>,
      ) => OutMessagePolicyStep<ParentModel>
      forward?: never
    }>
  | Readonly<{
      /** Maps selected child OutMessages into the parent's OutMessage union.
       * Return `undefined` for a named variant that stops at this parent. */
      forward: (outMessage: ChildOutMessage) => unknown | undefined
      /** Also handles child OutMessages locally. A parent OutMessage returned by
       * this Step takes precedence over the value returned by `forward`. */
      fold?: (
        outMessage: ChildOutMessage,
        context: Update.FoldContext<ChildMessage, ParentMessage, ParentModel>,
      ) => OutMessagePolicyStep<ParentModel>
    }>

type ValidateForwardPolicy<Policy> =
  Policy extends Readonly<{
    forward: infer Forward extends AnyFunction
  }>
    ? IsAny<ReturnType<Forward>> extends true
      ? never
      : IsUnknown<ReturnType<Forward>> extends true
        ? never
        : [ReturnType<Forward>] extends [void]
          ? never
          : [Exclude<ReturnType<Forward>, undefined>] extends [never]
            ? never
            : unknown
    : unknown

/** @internal Checks an inferred Binding OutMessage policy. */
export type ValidateStaticPolicy<
  Policy,
  ParentModel,
  ChildMessage,
  ParentMessage,
  ChildOutMessage,
> = [Policy] extends [
  OutMessagePolicy<ParentModel, ChildMessage, ParentMessage, ChildOutMessage>,
]
  ? ValidateForwardPolicy<Policy>
  : never

type SubscriptionWhen<BlockValue extends BindableBlock, ParentModel> =
  | ((model: ParentModel) => boolean)
  | Readonly<
      Partial<
        Record<
          keyof BlockValue['subscriptions'],
          (model: ParentModel) => boolean
        >
      >
    >

/** Declares how one child Block is stored in a parent Model and how its
 * Messages and lifecycle work cross the parent boundary. */
export type BindingBaseConfig<
  BlockValue extends BindableBlock,
  ParentModel,
  ParentMessage,
  Placement extends string,
> = Readonly<{
  /** Identifies this Binding within the parent's composition graph. It does not
   * identify a DOM position or require the child to occupy a same-named Model
   * field. Direct-field configs default to `field`; accessor configs default to
   * the child Block ID. Child presence does not change the placement. Supply an
   * override only to avoid a sibling default collision or preserve a deliberate
   * stable identity. */
  placement?: Placement
  /** Reads the current child Model. Returning `None` makes the occurrence absent:
   * folds leave the parent Model unchanged and Foldkit stops its lifecycle work. */
  read: (model: ParentModel) => Option.Option<BlockModel<BlockValue>>
  /** Writes the next child Model into the parent Model after a child update or
   * exposed operation. */
  write: (
    model: ParentModel,
    nextChildModel: BlockModel<BlockValue>,
  ) => ParentModel
  /** Maps child Messages into the parent Message type for views, Commands,
   * Subscriptions, ManagedResources, and Mounts. */
  toParentMessage: (message: BlockMessage<BlockValue>) => ParentMessage
  parentMessage?: never
  /** Adds optional activation gates for child Subscriptions while the child is
   * present. Gates do not disable updates or other lifecycle channels. */
  subscriptions?: Readonly<{
    /** Enables every child Subscription with one predicate, or selected named
     * Subscriptions with a partial record. Unspecified entries default to
     * enabled. */
    when?: SubscriptionWhen<BlockValue, ParentModel>
  }>
}>

/** The complete placement and parent policy used to bind one child Block. */
export type BindingConfig<
  BlockValue extends Readonly<{
    Model: Readonly<{ Type: any }>
    Message: Readonly<{ Type: any }>
    subscriptions: Readonly<Record<string, unknown>>
  }>,
  ParentModel,
  ParentMessage,
  Placement extends string,
  Policy = never,
> = Readonly<{
  /** Identifies this accessor Binding within the parent's composition graph. It
   * defaults to the child Block ID. It does not identify a DOM position or a
   * Model field. Child presence does not change the placement. Supply an
   * override only to avoid a sibling default collision or preserve a deliberate
   * stable identity. */
  placement?: Placement
  /** Reads the current child Model. Returning `None` makes the occurrence absent:
   * folds leave the parent Model unchanged and Foldkit stops its lifecycle work. */
  read: (model: ParentModel) => Option.Option<BlockValue['Model']['Type']>
  /** Writes the next child Model into the parent Model after a child update or
   * exposed operation. */
  write: (
    model: ParentModel,
    nextChildModel: BlockValue['Model']['Type'],
  ) => ParentModel
  /** Adds optional activation gates for child Subscriptions while the child is
   * present. */
  subscriptions?: Readonly<{
    /** Enables every child Subscription with one predicate, or selected named
     * Subscriptions with a partial record. Unspecified entries default to
     * enabled. */
    when?:
      | ((model: ParentModel) => boolean)
      | Readonly<
          Partial<
            Record<
              keyof BlockValue['subscriptions'],
              (model: ParentModel) => boolean
            >
          >
        >
  }>
}> &
  BindingMessagePolicy<BlockValue, ParentModel, ParentMessage> &
  Readonly<{
    /** Handles every child OutMessage locally, forwards selected variants, or
     * does both. This property is required exactly when the child declares an
     * OutMessage type. */
    outMessage?: Policy
  }> &
  (BlockValue extends Readonly<{
    OutMessage: Readonly<{ Type: infer ChildOutMessage }>
    Message: Readonly<{ Type: infer ChildMessage }>
  }>
    ? Readonly<{ outMessage: Policy }> &
        ([Policy] extends [
          OutMessagePolicy<
            ParentModel,
            ChildMessage,
            ParentMessage,
            ChildOutMessage
          >,
        ]
          ? Policy extends Readonly<{
              forward: infer Forward extends (
                ...args: ReadonlyArray<any>
              ) => any
            }>
            ? 0 extends 1 & ReturnType<Forward>
              ? never
              : unknown extends ReturnType<Forward>
                ? never
                : [ReturnType<Forward>] extends [void]
                  ? never
                  : [Exclude<ReturnType<Forward>, undefined>] extends [never]
                    ? never
                    : unknown
            : unknown
          : never)
    : Readonly<{ outMessage?: never }>)

type OutMessageOfProducer<
  Producer extends (...args: ReadonlyArray<any>) => any,
> =
  ReturnType<Producer> extends infer Output
    ? Output extends unknown
      ? 'outMessage' extends keyof Output
        ? Output extends Readonly<{ outMessage?: infer OutMessage }>
          ? Exclude<OutMessage, undefined>
          : never
        : never
      : never
    : never

type OutMessagePolicyStep<ParentModel> = (
  model: ParentModel & Update.GraphCapability<ParentModel, unknown>,
) =>
  | Readonly<{ model: ParentModel }>
  | Update.ResultRecipe<ParentModel, unknown, unknown, unknown, unknown>

/**
 * @internal Passive channels computed directly from one connected Binding.
 * Policy-produced channels remain an opaque obligation until a completed
 * Composition resolves them against its registered graph. Raw requirement and
 * registration inspection therefore reports only the direct child operation.
 */
export type BindingOperationRecipe<
  ParentModel,
  ParentMessage,
  ChildProducer extends (...args: ReadonlyArray<any>) => any,
  Policy,
  Placement extends string,
  ChildId extends string,
  Registration,
> = [Policy] extends [never]
  ? Update.ResultRecipe<
      ParentModel,
      ParentMessage,
      never,
      Qualify<Placement, Update.RequirementsOf<ChildProducer>>,
      Registration
    >
  : IsSilentOperation<ChildProducer> extends true
    ? Update.ResultRecipe<
        ParentModel,
        ParentMessage,
        never,
        Qualify<Placement, Update.RequirementsOf<ChildProducer>>,
        Registration
      >
    : Update.ResultRecipe<
        ParentModel,
        ParentMessage,
        never,
        Qualify<Placement, Update.RequirementsOf<ChildProducer>>,
        | Registration
        | Update.DeferredResultEvidence<
            DeferredBindingPolicy<Placement, ChildId>
          >
      >

/** The readable parent result after applying a child operation and lifting its
 * Commands and OutMessage policy. Operations that cannot emit an OutMessage
 * keep the plain {@link Update.Return} contract. Binding projections expose an
 * opaque {@link Update.ResultRecipe} until checked composition applies them. */
export type BindingReturn<
  ParentModel,
  ParentMessage,
  ChildProducer extends (...args: ReadonlyArray<any>) => any,
  Policy,
  Placement extends string = string,
  ChildId extends string = never,
  Registration = never,
> = Update.WithRegistrationEvidence<
  [OutMessageOfProducer<ChildProducer>] extends [never]
    ? Update.Return<
        ParentModel,
        ParentMessage,
        Qualify<Placement, Update.RequirementsOf<ChildProducer>>
      >
    : (
          Policy extends Readonly<{
            fold?: (
              ...args: ReadonlyArray<any>
            ) => (...args: ReadonlyArray<any>) => infer PolicyReturn
          }>
            ? PolicyReturn
            : never
        ) extends infer PolicyReturn
      ?
          | (Policy extends Readonly<{
              forward: (
                ...args: ReadonlyArray<any>
              ) => infer ForwardedOutMessage
            }>
              ? Exclude<ForwardedOutMessage, undefined>
              : never)
          | (PolicyReturn extends unknown
              ? 'outMessage' extends keyof PolicyReturn
                ? PolicyReturn extends Readonly<{
                    outMessage?: infer DerivedOutMessage
                  }>
                  ? Exclude<DerivedOutMessage, undefined>
                  : never
                : never
              : never) extends infer ParentOutMessage
        ? (
            PolicyReturn extends unknown
              ? 'commands' extends keyof PolicyReturn
                ? PolicyReturn extends Readonly<{ commands?: infer Commands }>
                  ? NonNullable<Commands> extends ReadonlyArray<
                      infer PolicyCommand
                    >
                    ? PolicyCommand
                    : never
                  : never
                : never
              : never
          ) extends infer PolicyCommand
          ? [ParentOutMessage] extends [never]
            ? Update.Return<
                ParentModel,
                | ParentMessage
                | (PolicyCommand extends Command<infer CommandMessage, any, any>
                    ? CommandMessage
                    : never),
                | Qualify<Placement, Update.RequirementsOf<ChildProducer>>
                | QualifyOwned<
                    Placement,
                    ChildId,
                    Update.RequirementsOf<() => PolicyReturn>
                  >
              >
            : Update.ReturnWithOutMessage<
                ParentModel,
                | ParentMessage
                | (PolicyCommand extends Command<infer CommandMessage, any, any>
                    ? CommandMessage
                    : never),
                ParentOutMessage,
                | Qualify<Placement, Update.RequirementsOf<ChildProducer>>
                | QualifyOwned<
                    Placement,
                    ChildId,
                    Update.RequirementsOf<() => PolicyReturn>
                  >
              >
          : never
        : never
      : never,
  | Registration
  | Update.RegistrationEvidenceOf<
      [OutMessageOfProducer<ChildProducer>] extends [never]
        ? never
        : Policy extends Readonly<{
              fold?: (
                ...args: ReadonlyArray<any>
              ) => (...args: ReadonlyArray<any>) => infer PolicyReturn
            }>
          ? PolicyReturn
          : never
    >
>

type Namespaced<Placement extends string, Entries> = {
  readonly [
    Key in keyof Entries as Key extends string ? `${Placement}/${Key}` : never
  ]: Entries[Key]
}

type BlockId<BlockValue> =
  BlockValue extends Readonly<{
    owner: Readonly<{ id: infer Id extends string }>
  }>
    ? Id
    : never

const liftSubscriptions = <
  BlockValue extends BindableBlock,
  ParentModel,
  ParentMessage,
>(
  block: BlockValue,
  config: Readonly<{
    read: (model: ParentModel) => Option.Option<BlockModel<BlockValue>>
    toParentMessage: (message: BlockMessage<BlockValue>) => ParentMessage
    when?: SubscriptionWhen<BlockValue, ParentModel>
  }>,
) => Subscription.lift(block.subscriptions)<ParentModel, ParentMessage>(config)

const liftManagedResources = <
  BlockValue extends BindableBlock,
  ParentModel,
  ParentMessage,
>(
  block: BlockValue,
  config: Readonly<{
    read: (model: ParentModel) => Option.Option<BlockModel<BlockValue>>
    toParentMessage: (message: BlockMessage<BlockValue>) => ParentMessage
  }>,
) =>
  ManagedResource.lift(block.managedResources)<ParentModel, ParentMessage>(
    config,
  )

/** @internal Projects declared operations as connected parent Steps. Their
 * graph-checked inputs and opaque results preserve the direct child channels
 * and an invariant policy obligation. A completed Composition resolves the
 * policy-produced channels against its full registered graph. */
export type BoundExposedOperations<
  BlockValue extends Readonly<{
    operations: Readonly<Record<string, (...args: ReadonlyArray<any>) => any>>
  }>,
  ParentModel,
  ParentMessage,
  Placement extends string,
  Policy,
  GeneratedSchema extends Schema.Top = never,
> = Readonly<{
  [
    Key in keyof BlockValue['operations']
  ]: BlockValue['operations'][Key] extends (...args: ReadonlyArray<any>) => any
    ? (
        ...args: Parameters<BlockValue['operations'][Key]> extends readonly [
          unknown,
          ...infer Context,
        ]
          ? Context
          : readonly []
      ) => (
        model: Update.GraphInput<
          ParentModel,
          BindingRequirement<Placement, BlockValue, GeneratedSchema>
        >,
      ) => BindingOperationRecipe<
        ParentModel,
        ParentMessage,
        BlockValue['operations'][Key],
        Policy,
        Placement,
        BlockId<BlockValue>,
        BindingRequirement<Placement, BlockValue, GeneratedSchema>
      >
    : never
}>

/**
 * Creates a passive, noncallable child initialization recipe.
 *
 * It retains the child init arguments, optional keyed identity, parent Model
 * constructor, appended parent Commands, and their requirements without
 * initializing the child eagerly. Return it intact from a matching Composition
 * `makeInit` callback or `makeUpdate` handler. A Definition-owned Step preserves or
 * wraps it. An exposed Message can reach an update branch that returns the
 * recipe, and the completed operation interprets that update result. The recipe
 * exposes no `.model` or `.commands` fields.
 *
 * The constructed parent must match its Model Schema and select the initialized
 * child through the Binding's storage accessors.
 */
export interface BindingInitializer<
  BlockValue extends Readonly<{
    Model: Readonly<{ Type: any }>
    init: (...args: ReadonlyArray<any>) => any
  }>,
  ParentModel,
  ParentMessage,
  Placement extends string,
  Key = never,
  IsKeyed extends boolean = false,
  AllowedParentMessage = ParentMessage,
  GeneratedSchema extends Schema.Top = never,
> {
  <
    const InitializedParentModel extends ParentModel,
    const ParentCommands extends
      | ReadonlyArray<Command<any, never, any>>
      | undefined = undefined,
  >(
    config: Readonly<{
      /** Arguments passed to the child Block's init function. */
      args: Parameters<BlockValue['init']>
      /** Constructs the complete parent Model and stores the initialized child
       * where this Binding's accessors select it. Parent Schema constructors may
       * reconstruct an equivalent decoded child value. */
      toParentModel: (
        child: BlockValue['Model']['Type'],
      ) => InitializedParentModel
      /** Parent Commands appended after the initialized child's lifted
       * Commands. Their services and Binding registrations remain required by
       * the complete result. */
      commands?: ParentCommands
    }> &
      (IsKeyed extends true
        ? Readonly<{
            /** Stable string or finite-number identity of the new occurrence. */
            key: Key
          }>
        : unknown) &
      ValidateConcreteInitializedModel<InitializedParentModel> &
      ValidateConcreteParentCommands<ParentCommands> &
      ValidateParentCommandMessages<
        ParentCommands,
        MessageOfInitializerSource<AllowedParentMessage>
      >,
  ): BindingInitRecipe<
    InitializedParentModel,
    ParentMessage | CommandMessageOfCommands<ParentCommands>,
    | Qualify<Placement, Update.RequirementsOf<BlockValue['init']>>
    | CommandRequirementsOf<ParentCommands>,
    | BindingRequirement<Placement, BlockValue, GeneratedSchema>
    | Update.RegistrationEvidenceOf<Readonly<{ commands: ParentCommands }>>
  >
}

/** A registered static or optional child Block in its parent Model and Message
 * context. The Binding is passive until a Runtime starts the composed
 * application. */
export type Binding<
  BlockValue extends Readonly<{
    Model: Readonly<{ Type: any }>
    Message: Readonly<{ Type: any }>
    OutMessage?: Readonly<{ Type: any }>
    init: (...args: ReadonlyArray<any>) => any
    update: (...args: ReadonlyArray<any>) => any
    operations: Readonly<Record<string, (...args: ReadonlyArray<any>) => any>>
    subscriptions: Subscription.Subscriptions<any, any, any>
    managedResources: Readonly<
      Record<
        string,
        ManagedResource.Entry<any, any, any, any, any, any, any, any>
      >
    >
    mounts: ReadonlyArray<LayeredMountDefinition>
    EffectsLayer: Layer.Any
  }>,
  ParentModel,
  ParentMessage,
  Placement extends string,
  Policy,
  ContractModel = never,
  ContractMessage = never,
  ContractOutMessage = never,
  OutgoingMessage = ParentMessage,
  IncomingMessage = never,
  InitializerMessage = ContractMessage,
  GeneratedSchema extends Schema.Top = never,
> = BindingEvidence<
  BlockValue,
  Qualify<Placement, HandlerEvidenceOfBlock<BlockValue>>,
  BindingInspection<
    {
      readonly [
        Key in keyof BlockValue['subscriptions']
      ]: BlockValue['subscriptions'][Key] extends Subscription.Subscription<
        any,
        any,
        infer Dependencies,
        infer Services
      >
        ? Subscription.Subscription<
            ParentModel,
            ParentMessage,
            Subscription.GatedDependencies<Dependencies>,
            Qualify<Placement, Services>
          > &
            (BlockValue['subscriptions'][Key] extends Readonly<{
              messages: infer Messages
            }>
              ? Readonly<{ messages: Messages }>
              : unknown) &
            (BlockValue['subscriptions'][Key] extends Readonly<{
              name: infer Name
              toLayer: infer ToLayer
            }>
              ? Readonly<{ name: Name; toLayer: ToLayer }>
              : unknown) &
            (BlockValue['subscriptions'][Key] extends Readonly<{
              layer: infer EntryLayer
            }>
              ? Readonly<{ layer: EntryLayer }>
              : unknown)
        : never
    },
    {
      readonly [
        Key in keyof BlockValue['managedResources']
      ]: BlockValue['managedResources'][Key] extends ManagedResource.Entry<
        any,
        any,
        infer Requirements,
        infer Value,
        infer Service,
        infer OnAcquired extends (...args: ReadonlyArray<any>) => any,
        infer LifecycleServices,
        infer Params
      >
        ? ManagedResource.Entry<
            ParentModel,
            ParentMessage,
            Requirements,
            Value,
            Qualify<Placement, Service>,
            (...args: Parameters<OnAcquired>) => ParentMessage,
            Qualify<Placement, LifecycleServices>,
            Params
          > &
            (BlockValue['managedResources'][Key] extends Readonly<{
              name: infer Name
              toLayer: infer ToLayer
            }>
              ? Readonly<{ name: Name; toLayer: ToLayer }>
              : unknown) &
            (BlockValue['managedResources'][Key] extends Readonly<{
              layer: infer EntryLayer
            }>
              ? Readonly<{ layer: EntryLayer }>
              : unknown)
        : never
    },
    BlockValue['mounts'],
    Layer.Layer<
      Qualify<Placement, Layer.Success<BlockValue['EffectsLayer']>>,
      Layer.Error<BlockValue['EffectsLayer']>,
      Qualify<Placement, Layer.Services<BlockValue['EffectsLayer']>>
    >
  >,
  false
> &
  BindingDeliveryEvidence<OutgoingMessage, IncomingMessage, GeneratedSchema> &
  BindingPolicyEvidence<Policy> &
  Readonly<{
    /** The stable identity of this Binding in the parent's composition graph. It
     * is independent of DOM position and child presence. */
    placement: Placement
    /** Creates a passive initialization recipe for this child. The registered
     * Composition later initializes the child, constructs the complete parent
     * Model, and lifts Commands to the parent Message type. Additional parent
     * Commands run after the initialized child's Commands. */
    init: BindingInitializer<
      BlockValue,
      ParentModel,
      ParentMessage,
      Placement,
      never,
      false,
      InitializerMessage,
      GeneratedSchema
    >
    /** Produces an opaque connected result for the child update, parent write,
     * lifted Commands, and OutMessage policy. Its Model input requires this exact
     * registered Binding graph. Checked execution leaves the parent Model
     * unchanged when `read` returns `None`. */
    fold: (
      model: Update.GraphInput<
        ParentModel,
        BindingRequirement<Placement, BlockValue, GeneratedSchema>
      >,
      ...args: [
        message: BlockValue['Message']['Type'],
        ...context: Parameters<BlockValue['update']> extends readonly [
          unknown,
          unknown,
          ...infer Context,
        ]
          ? Context
          : readonly [],
      ]
    ) => BindingOperationRecipe<
      ParentModel,
      ParentMessage,
      BlockValue['update'],
      Policy,
      Placement,
      BlockId<BlockValue>,
      BindingRequirement<Placement, BlockValue, GeneratedSchema>
    >
    /** Builds the `h.block` config for this placement. The config carries the
     * Message mapping, composition identity, and Mount evidence. */
    embedView: BlockValue extends Readonly<{
      [DefaultViewTypeId]: infer CanonicalView extends AnyBlockView
    }>
      ? {
          <View extends AnyBlockView>(
            config: Omit<
              BoundBlockFields<View, ParentMessage>,
              'toParentMessage'
            > &
              ValidateEmbeddedViewMounts<BlockValue, View> &
              ([Parameters<View>[0], BlockValue['Model']['Type']] extends [
                BlockValue['Model']['Type'],
                Parameters<View>[0],
              ]
                ? [
                    Parameters<
                      BoundBlockFields<View, ParentMessage>['toParentMessage']
                    >[0],
                    BlockValue['Message']['Type'],
                  ] extends [
                    BlockValue['Message']['Type'],
                    Parameters<
                      BoundBlockFields<View, ParentMessage>['toParentMessage']
                    >[0],
                  ]
                  ? unknown
                  : never
                : never),
          ): BoundBlockConfig<
            BoundBlockView<View, BindingRequirement<Placement, BlockValue>>,
            ParentMessage
          >
          (
            config: Omit<
              BoundBlockFields<CanonicalView, ParentMessage>,
              'toParentMessage' | 'view'
            > &
              Readonly<{ view?: CanonicalView }>,
          ): BoundBlockConfig<
            BoundBlockView<
              CanonicalView,
              BindingRequirement<Placement, BlockValue>
            >,
            ParentMessage
          >
        }
      : <View extends AnyBlockView>(
          config: Omit<
            BoundBlockFields<View, ParentMessage>,
            'toParentMessage'
          > &
            ValidateEmbeddedViewMounts<BlockValue, View> &
            ([Parameters<View>[0], BlockValue['Model']['Type']] extends [
              BlockValue['Model']['Type'],
              Parameters<View>[0],
            ]
              ? [
                  Parameters<
                    BoundBlockFields<View, ParentMessage>['toParentMessage']
                  >[0],
                  BlockValue['Message']['Type'],
                ] extends [
                  BlockValue['Message']['Type'],
                  Parameters<
                    BoundBlockFields<View, ParentMessage>['toParentMessage']
                  >[0],
                ]
                ? unknown
                : never
              : never),
        ) => BoundBlockConfig<
          BoundBlockView<View, BindingRequirement<Placement, BlockValue>>,
          ParentMessage
        >
  }> &
  BoundExposedOperations<
    BlockValue,
    ParentModel,
    ParentMessage,
    Placement,
    Policy,
    GeneratedSchema
  > &
  OptionalParentBindingContract<
    ContractModel,
    ContractMessage,
    ContractOutMessage
  >

type ValidateParentMessageConstructor<
  BlockValue extends BindableBlock,
  Mapper,
> = Mapper extends Schema.Constraint &
  Readonly<{
    fields: Readonly<{
      _tag: unknown
      message: Readonly<{ Type: infer Message }>
    }>
  }>
  ? Exclude<keyof Mapper['fields'], '_tag' | 'message'> extends never
    ? IsAny<Message> extends true
      ? never
      : [Message, BlockValue['Message']['Type']] extends [
            BlockValue['Message']['Type'],
            Message,
          ]
        ? unknown
        : never
    : never
  : never

/** Selects exactly one child-to-parent Message mapping for a static Binding. */
export type MessageMapping<BlockValue extends BindableBlock, Mapper> =
  | Readonly<{
      /** Maps each child Message into the parent Message union. */
      toParentMessage: Mapper &
        NoInfer<(message: BlockValue['Message']['Type']) => unknown>
      parentMessage?: never
    }>
  | Readonly<{
      /** Constructs a parent wrapper Message whose only field is the child
       * `message`. */
      parentMessage: Mapper &
        ValidateParentMessageConstructor<BlockValue, Mapper> &
        NoInfer<
          (
            fields: Readonly<{ message: BlockValue['Message']['Type'] }>,
          ) => unknown
        >
      toParentMessage?: never
    }>

type AccessorBind<BlockValue extends BindableBlock> =
  BlockValue extends Readonly<{
    OutMessage: Readonly<{ Type: infer ChildOutMessage }>
  }>
    ? <
        ParentModel,
        const ToParentMessage,
        const Policy,
        const Placement extends string = BlockValue extends Readonly<{
          owner: Readonly<{ id: infer Id extends string }>
        }>
          ? Id
          : never,
      >(
        config: Omit<
          BindingBaseConfig<BlockValue, ParentModel, never, Placement>,
          'toParentMessage' | 'parentMessage'
        > &
          MessageMapping<BlockValue, ToParentMessage> &
          Readonly<{
            outMessage: Policy
          }> &
          ValidateStaticPolicy<
            Policy,
            NoInfer<ParentModel>,
            NoInfer<BlockValue['Message']['Type']>,
            NoInfer<ReturnOf<ToParentMessage>>,
            NoInfer<ChildOutMessage>
          > &
          ValidateConcreteComposition<BlockValue>,
      ) => Binding<
        BlockValue,
        ParentModel,
        ReturnOf<ToParentMessage>,
        Placement,
        Policy
      >
    : <
        ParentModel,
        const ToParentMessage,
        const Placement extends string = BlockValue extends Readonly<{
          owner: Readonly<{ id: infer Id extends string }>
        }>
          ? Id
          : never,
      >(
        config: Omit<
          BindingBaseConfig<BlockValue, ParentModel, never, Placement>,
          'toParentMessage' | 'parentMessage'
        > &
          MessageMapping<BlockValue, ToParentMessage> &
          Readonly<{
            outMessage?: never
          }> &
          ValidateConcreteComposition<BlockValue>,
      ) => Binding<
        BlockValue,
        ParentModel,
        ReturnOf<ToParentMessage>,
        Placement,
        never
      >

/** Creates a static Binding using explicit accessors or a required Struct field. */
export type Bind<BlockValue extends BindableBlock> = AccessorBind<BlockValue> &
  DirectConnection<BlockValue>

/** Structural bound for any child Binding stored by a parent Block.
 * @inline */
export type AnyBinding = Readonly<{
  [ConnectionEvidenceTypeId]: ConnectionEvidence<
    BindableBlock,
    unknown,
    BindingInspection<any, any, any, any>,
    boolean
  >
  placement: string
  init: AnyFunction
  fold: AnyFunction
  embedView: AnyFunction
}> &
  BindingDeliveryEvidence<any, any, any>

/** Type-level evidence that an embedded view belongs to one registered Binding
 * placement. */
export type BindingRequirement<
  Placement extends string,
  BlockValue,
  GeneratedSchema extends Schema.Top = never,
> = Readonly<{
  __blockBindingRequirement: Readonly<{
    placement: Placement
    generatedSchema: () => GeneratedSchema
    block: BlockValue extends Readonly<{ mounts: infer Mounts }>
      ? Readonly<{
          owner: BlockValue extends Readonly<{ owner: infer OwnerValue }>
            ? OwnerValue
            : unknown
          mountRequirements: () => BlockValue extends Readonly<{
            owner: unknown
          }>
            ? MountRequirementsOf<Mounts>
            : AnyMountHandler
        }>
      : never
  }>
}>

/**
 * @internal Structural block evidence used by type-level fixtures.
 */
export type BindingBlockEvidence<
  BlockValue,
  HandlerRequirements = never,
  Inspection = BindingInspection<
    Readonly<Record<never, never>>,
    Readonly<Record<never, never>>,
    readonly [],
    Layer.Layer<never, never, never>
  >,
  IsKeyed extends boolean = false,
> = BindingEvidence<BlockValue, HandlerRequirements, Inspection, IsKeyed>

/** Recovers the completed Block type retained by a Binding. */
export type BlockOfBinding<BindingValue> =
  BindingValue extends Readonly<{
    [ConnectionEvidenceTypeId]: Readonly<{ block: infer BlockValue }>
  }>
    ? BlockValue
    : never

/** @internal Recovers unresolved handler evidence retained by a binding. */
export type HandlerRequirementsOfBinding<BindingValue> =
  BindingValue extends Readonly<{
    [ConnectionEvidenceTypeId]: Readonly<{
      handlerRequirements: infer HandlerRequirements
    }>
  }>
    ? HandlerRequirements
    : unknown

/** @internal Reports whether a Binding owns a keyed collection. */
export type IsKeyedBinding<BindingValue> =
  BindingValue extends Readonly<{
    [ConnectionEvidenceTypeId]: Readonly<{ isKeyed: infer IsKeyed }>
  }>
    ? IsKeyed
    : false

/** @internal Removes private evidence before another Binding form replaces it. */
export type WithoutBindingEvidence<BindingValue> = Omit<
  WithoutBindingDeliveryEvidence<BindingValue>,
  typeof ConnectionEvidenceTypeId
>

/** Recovers the registered view capability requirement for one Binding. */
export type RequirementOfBinding<BindingValue> =
  BindingValue extends Readonly<{
    placement: infer Placement extends string
    [ConnectionEvidenceTypeId]: Readonly<{ block: infer BlockValue }>
  }>
    ? BindingRequirement<
        Placement,
        BlockValue,
        BindingValue extends BindingDeliveryEvidence<any, any, infer Generated>
          ? Generated
          : never
      >
    : never

/** @internal Recovers generated child Messages proven by Binding registration. */
export type GeneratedMessageOfRequirement<Requirement> =
  Requirement extends BindingRequirement<any, any, infer GeneratedSchema>
    ? GeneratedSchema extends Schema.Top
      ? GeneratedSchema['Type']
      : never
    : never

/** Collects the registered view capability requirements of child Bindings. */
export type RequirementsOfBindings<Bindings extends ReadonlyArray<unknown>> =
  RequirementOfBinding<Bindings[number]>

/**
 * @internal Returns the block retained by a binding.
 */
export const blockOf = (binding: AnyBinding): BindableBlock => {
  const block = runtimeBindingOf(binding).block
  if (block === undefined) {
    throw new Error(
      '[foldkit] Block Binding metadata is unavailable. Create Bindings through the parent Definition.makeBinding method.',
    )
  }

  return block
}

/** Returns a Binding's lifecycle registrations and Layer metadata. */
export const inspectBinding = <BindingValue extends AnyBinding>(
  binding: BindingValue,
): InspectionOfBinding<BindingValue> =>
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  runtimeBindingOf(binding).inspection as InspectionOfBinding<BindingValue>

type RuntimeOutMessagePolicy = Readonly<{
  fold?: AnyFunction
  forward?: AnyFunction
}>

type RuntimeBindingConfig = Readonly<{
  placement: string
  read: (model: any) => Option.Option<any>
  write: (model: any, nextChildModel: any) => any
  toParentMessage: (message: any) => any
  subscriptions?: Readonly<{ when?: any }>
  outMessage?: RuntimeOutMessagePolicy | undefined
  outgoingParentMessage?: Schema.Top
  fromParentMessage?: RuntimeFromParentMessage
}>

const toChildFold = (producer: AnyProducer, config: RuntimeBindingConfig) => ({
  update: (childModel: any, args: ReadonlyArray<any>) =>
    producer(childModel, ...args),
  read: config.read,
  write: config.write,
  toParentMessage: config.toParentMessage,
  ...(config.outMessage?.fold === undefined
    ? {}
    : { foldOutMessage: config.outMessage.fold }),
  ...(config.outMessage?.forward === undefined
    ? {}
    : { toParentOutMessage: config.outMessage.forward }),
})

const scopeReturn = (
  output: AnyUpdateReturn,
  placement: string,
  owner: Owner<any>,
  frame?: InstanceFrame,
  allowedIdentities: ReadonlyArray<DefinitionIdentity> = [],
): AnyUpdateReturn =>
  output.commands === undefined
    ? output
    : Update.withOutMessage(
        {
          model: output.model,
          commands: output.commands.map(command =>
            qualifyCommand(placement, command, owner, frame, allowedIdentities),
          ),
        },
        output.outMessage,
      )

const scopePolicy = (
  config: RuntimeBindingConfig,
  owner: Owner<any>,
  frame?: InstanceFrame,
  allowedIdentities: ReadonlyArray<DefinitionIdentity> = [],
): RuntimeBindingConfig => ({
  ...config,
  ...(config.outMessage?.fold === undefined
    ? {}
    : {
        outMessage: {
          ...config.outMessage,
          fold: (outMessage: unknown, context: Update.FoldContext<any, any>) =>
            config.outMessage!.fold!(outMessage, {
              ...context,
              liftCommand: (command: Command<any, any, any>) =>
                context.liftCommand(
                  qualifyCommand(
                    config.placement,
                    command,
                    owner,
                    frame,
                    allowedIdentities,
                  ),
                ),
              liftCommands: (commands: ReadonlyArray<Command<any, any, any>>) =>
                context.liftCommands(
                  commands.map(command =>
                    qualifyCommand(
                      config.placement,
                      command,
                      owner,
                      frame,
                      allowedIdentities,
                    ),
                  ),
                ),
            }),
        },
      }),
})

const makeFold = (
  producer: AnyProducer,
  config: RuntimeBindingConfig,
  frame: InstanceFrame,
): AnyFunction => {
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  const makeChildFold = Update.foldChild as unknown as (
    childFold: ReturnType<typeof toChildFold>,
  ) => AnyFunction
  const execute = (model: any, args: ReadonlyArray<any>) => {
    const contextualConfig =
      config.outMessage?.fold === undefined
        ? config
        : {
            ...config,
            outMessage: {
              ...config.outMessage,
              fold: (
                outMessage: unknown,
                context: Update.FoldContext<any, any>,
              ) => {
                const policyStep = config.outMessage!.fold!(outMessage, {
                  ...context,
                  modelBeforeUpdate: model,
                })
                return (modelWithChild: any) =>
                  resolveOperationOutput(
                    policyStep(modelWithChild),
                    modelWithChild,
                  )
              },
            },
          }
    return makeChildFold(toChildFold(producer, contextualConfig))(model, args)
  }

  return (model: any, ...args: ReadonlyArray<any>) =>
    isRegisteredBinding(frame.binding)
      ? execute(model, args)
      : makeResultRecipe(activeModel => {
          assertRegisteredBinding(frame.binding, config.placement)
          return execute(activeModel, args)
        })
}

const makeBoundOperation = (
  producer: AnyProducer,
  config: RuntimeBindingConfig,
  frame: InstanceFrame,
): AnyFunction => {
  const fold = makeFold(producer, config, frame)
  return (...args: ReadonlyArray<any>) =>
    (model: any) =>
      fold(model, ...args)
}

const makeBoundOperations = (
  operations: Readonly<Record<string, AnyProducer>>,
  config: RuntimeBindingConfig,
  frame: InstanceFrame,
): Readonly<Record<string, AnyFunction>> => {
  assertValidBindingOperationNames(operations)
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  const boundOperations = Object.create(null) as Record<string, AnyFunction>

  for (const [name, operation] of Object.entries(operations)) {
    Object.defineProperty(boundOperations, name, {
      value: makeBoundOperation(operation, config, frame),
      enumerable: true,
    })
  }

  return boundOperations
}

const bindRuntime = <
  const BlockValue extends BindableBlock,
  ParentModel,
  ParentMessage,
  const Placement extends string,
  const Policy = never,
>(
  block: BlockValue,
  bindingConfig: RuntimeBindingConfig,
): Binding<BlockValue, ParentModel, ParentMessage, Placement, Policy> => {
  const trackedMapper = trackParentMessageMapper(bindingConfig.toParentMessage)
  const config = {
    ...bindingConfig,
    toParentMessage: trackedMapper.toParentMessage,
  }
  const placement = config.placement ?? block.owner.id
  const isChildModel = Reflect.apply(Schema.is, undefined, [block.Model])
  const equivalentChildModel = Reflect.apply(Schema.toEquivalence, undefined, [
    block.Model,
  ])
  assertSegment(placement)
  const allowedIdentities = hostIdentitiesOf(block)
  const frame: InstanceFrame = {
    get binding() {
      return binding
    },
  }
  const runtimeConfig = scopePolicy(
    { ...config, placement },
    block.owner,
    frame,
    allowedIdentities,
  )
  const update = (model: any, ...args: ReadonlyArray<any>) =>
    scopeReturn(
      withOperationGraph(runtimeBindingsOf(block), () =>
        block.update(model, ...args),
      ),
      placement,
      block.owner,
      frame,
      allowedIdentities,
    )
  const exposedOperations = Record.map(
    block.operations,
    operation =>
      (model: any, ...args: ReadonlyArray<any>) =>
        scopeReturn(
          withOperationGraph(runtimeBindingsOf(block), () =>
            operation(model, ...args),
          ),
          placement,
          block.owner,
          frame,
          allowedIdentities,
        ),
  )
  const liftedSubscriptions = liftSubscriptions(block, {
    read: config.read,
    toParentMessage: config.toParentMessage,
    ...(config.subscriptions?.when === undefined
      ? {}
      : { when: config.subscriptions.when }),
  })
  const liftedManagedResources = liftManagedResources(block, {
    read: config.read,
    toParentMessage: config.toParentMessage,
  })
  const subscriptions = Record.map(liftedSubscriptions, (entry, key) => {
    copyIdentity(block.subscriptions[key]!, entry)
    const scoped = {
      ...qualifyEntry(placement, entry),
      dependenciesToStream: (dependencies: any, getSnapshot: any) =>
        qualifyStream(
          placement,
          entry.dependenciesToStream(dependencies, getSnapshot),
        ),
    }
    copyIdentity(entry, scoped)
    return scoped
  })
  const managedResources = Record.map(liftedManagedResources, (entry, key) => {
    copyIdentity(block.managedResources[key]!, entry)
    const scoped = {
      ...qualifyEntry(placement, entry),
      resource: {
        ...entry.resource,
        key: `${placement}/${entry.resource.key}`,
        _tag: Context.Service(qualifyKey(placement, entry.resource._tag.key)),
      },
      // oxlint-disable-next-line effecttsgo/any-unknown-in-error-context
      acquire: (params: any) => qualifyEffect(placement, entry.acquire(params)),
      // oxlint-disable-next-line effecttsgo/any-unknown-in-error-context
      release: (value: any) => qualifyEffect(placement, entry.release(value)),
    }
    copyIdentity(entry, scoped)
    return scoped
  })
  const embedView = <View extends AnyBlockView>(
    embedConfig: Omit<
      BoundBlockFields<View, ParentMessage>,
      'toParentMessage' | 'view'
    > &
      Readonly<{ view?: View }>,
  ): BoundBlockConfig<
    BoundBlockView<View, BindingRequirement<Placement, BlockValue>>,
    ParentMessage
  > =>
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    ({
      ...embedConfig,
      view: embedConfig.view ?? defaultViewOf(block),
      [ViewScopeTypeId]: {
        placement,
        binding,
        identity: {
          owner: block.owner,
          mounts: block[LocalMountsTypeId],
          bindings: runtimeBindingsOf(block),
        },
      },
      toParentMessage: config.toParentMessage,
    }) as unknown as BoundBlockConfig<
      BoundBlockView<View, BindingRequirement<Placement, BlockValue>>,
      ParentMessage
    >

  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  const boundOperations = makeBoundOperations(
    exposedOperations,
    runtimeConfig,
    frame,
  )

  const EffectsLayer = qualifyLayer(
    placement,
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    block.EffectsLayer as Layer.Layer<
      Layer.Success<BlockValue['EffectsLayer']>,
      Layer.Error<BlockValue['EffectsLayer']>,
      Layer.Services<BlockValue['EffectsLayer']>
    >,
  )

  const initChild = (...args: ReadonlyArray<any>) => {
    assertRegisteredInitialization(binding, placement)
    const childInit = scopeReturn(
      withOperationGraph(runtimeBindingsOf(block), () => block.init(...args)),
      placement,
      block.owner,
      { ...frame, isInitialization: true },
      allowedIdentities,
    )
    return {
      model: childInit.model,
      commands: mapMessages(childInit.commands, config.toParentMessage),
    }
  }
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  const binding = {
    placement,
    init: (initial: unknown) => {
      assertBindingInitConfig(initial, placement)
      const { toParentModel } = initial
      const args = [...initial.args]
      const commands = [...(initial.commands ?? [])]

      return makeBindingInitRecipe(binding, () => {
        const childInit = initChild(...args)
        const model = toParentModel(childInit.model)
        assertInitializedParentModel(binding, placement, model)
        let maybeStoredChild: Option.Option<unknown>
        try {
          maybeStoredChild = config.read(model)
        } catch (cause) {
          throw new Error(
            `[foldkit] Child Binding "${placement}" init.toParentModel returned a parent Model that its read accessor could not inspect.`,
            { cause },
          )
        }
        if (
          Option.isNone(maybeStoredChild) ||
          !isChildModel(maybeStoredChild.value) ||
          !equivalentChildModel(maybeStoredChild.value, childInit.model)
        ) {
          throw new Error(
            `[foldkit] Child Binding "${placement}" init.toParentModel must preserve the initialized child Model through the parent Model Schema.`,
          )
        }
        return {
          model,
          commands: [...(childInit.commands ?? []), ...commands],
        }
      })
    },
    fold: makeFold(update, runtimeConfig, frame),
    embedView,
    ...boundOperations,
  } as unknown as Binding<
    BlockValue,
    ParentModel,
    ParentMessage,
    Placement,
    Policy
  >

  registerBinding(binding, {
    block,
    init: (_key, args) => initChild(...args),
    select: model =>
      Option.match(config.read(model), {
        onNone: () => [],
        onSome: childModel => [{ model: childModel }],
      }),
    toParentMessage: (_key, message) => config.toParentMessage(message),
    subscriptionWhen: (model, _key, name) => {
      const when = config.subscriptions?.when
      if (typeof when === 'function') {
        return when(model)
      }
      return when?.[name]?.(model) ?? true
    },
    inspection: {
      subscriptions,
      managedResources,
      mounts: block.mounts,
      EffectsLayer,
    },
  })
  registerBindingDelivery(binding, trackedMapper, {
    ...(config.outgoingParentMessage === undefined
      ? {}
      : { outgoingParentMessage: config.outgoingParentMessage }),
    ...(config.fromParentMessage === undefined
      ? {}
      : { fromParentMessage: config.fromParentMessage }),
  })

  return binding
}

type BindBlock = {
  <
    const BlockValue extends BindableBlock &
      Readonly<{ OutMessage: Readonly<{ Type: any }> }>,
    ParentModel,
    ParentMessage,
    const Placement extends string,
    const Policy extends OutMessagePolicy<
      ParentModel,
      BlockMessage<BlockValue>,
      ParentMessage,
      BlockValue['OutMessage']['Type']
    >,
  >(
    block: BlockValue,
    config: BindingBaseConfig<
      BlockValue,
      ParentModel,
      ParentMessage,
      Placement
    > &
      Readonly<{ outMessage: Policy }> &
      ValidateForwardPolicy<Policy>,
  ): Binding<BlockValue, ParentModel, ParentMessage, Placement, Policy>
  <
    const BlockValue extends BindableBlock & Readonly<{ OutMessage?: never }>,
    ParentModel,
    ParentMessage,
    const Placement extends string,
  >(
    block: BlockValue,
    config: BindingBaseConfig<
      BlockValue,
      ParentModel,
      ParentMessage,
      Placement
    > &
      Readonly<{ outMessage?: never }>,
  ): Binding<BlockValue, ParentModel, ParentMessage, Placement, never>
  (block: BindableBlock, config: never): AnyBinding
}

/**
 * Binds a complete child block to one static or optional state placement.
 * Update, exposed operations, Subscriptions, and ManagedResources use its
 * placement accessors. Lifecycle and view Messages use its parent lift. Parent
 * init ordering remains explicit.
 */
/* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
export const bind: BindBlock = bindRuntime as unknown as BindBlock

type ChildRecordFunction<
  Child extends AnyBinding,
  Key extends 'subscriptions' | 'managedResources',
> = Child extends unknown
  ? (
      entries: Namespaced<Child['placement'], InspectionOfBinding<Child>[Key]>,
    ) => void
  : never

type MergeRecords<
  Children extends ReadonlyArray<AnyBinding>,
  Key extends 'subscriptions' | 'managedResources',
> = [Children[number]] extends [never]
  ? {}
  : ChildRecordFunction<Children[number], Key> extends (
        entries: infer Entries,
      ) => void
    ? Entries
    : {}

type ChildMount<Children extends ReadonlyArray<AnyBinding>> =
  InspectionOfBinding<Children[number]>['mounts'][number]

type LayerSuccess<Children extends ReadonlyArray<AnyBinding>> = Layer.Success<
  InspectionOfBinding<Children[number]>['EffectsLayer']
>

type LayerError<Children extends ReadonlyArray<AnyBinding>> = Layer.Error<
  InspectionOfBinding<Children[number]>['EffectsLayer']
>

type LayerServices<Children extends ReadonlyArray<AnyBinding>> = Layer.Services<
  InspectionOfBinding<Children[number]>['EffectsLayer']
>

/** The lifecycle registrations and handler recipe contributed by a block's
 * bound children. */
export type AggregatedChildren<Children extends ReadonlyArray<AnyBinding>> =
  Readonly<{
    subscriptions: MergeRecords<Children, 'subscriptions'>
    managedResources: MergeRecords<Children, 'managedResources'>
    mounts: ReadonlyArray<ChildMount<Children>>
    EffectsLayer: Layer.Layer<
      LayerSuccess<Children>,
      LayerError<Children>,
      LayerServices<Children>
    >
  }>

const mergeChildRecords = (
  kind: 'Subscription' | 'ManagedResource',
  bindings: ReadonlyArray<AnyBinding>,
): Record<string, unknown> => {
  const entries: Record<string, unknown> = {}

  for (const childBinding of bindings) {
    const inspection = inspectBinding(childBinding)
    const childEntries =
      inspection[kind === 'Subscription' ? 'subscriptions' : 'managedResources']

    for (const [key, entry] of Object.entries(childEntries)) {
      const registrationKey = `${childBinding.placement}/${key}`
      if (Object.hasOwn(entries, registrationKey)) {
        throw new Error(
          `Block.aggregateChildren: duplicate ${kind} registration key "${registrationKey}"`,
        )
      }

      entries[registrationKey] = entry
    }
  }

  return entries
}

/** Aggregates the complete static registrations of bound children. It qualifies
 * collected record keys by placement while each binding keeps readable local
 * keys for direct access. Repeated Mount blocks are shared, as is one
 * block's handler recipe across multiple placements. ManagedResources
 * receive placement-qualified service identities and independent value slots. */
export const aggregateChildren = <
  const Children extends ReadonlyArray<AnyBinding>,
>(
  bindings: Children,
): AggregatedChildren<Children> => {
  const subscriptions = mergeChildRecords('Subscription', bindings)
  const managedResources = mergeChildRecords('ManagedResource', bindings)
  const mounts: Array<LayeredMountDefinition> = []
  const seenMounts = new Set<LayeredMountDefinition>()
  const layers: Array<Layer.Any> = []
  const seenPlacements = new Set<string>()

  for (const childBinding of bindings) {
    if (seenPlacements.has(childBinding.placement)) {
      throw new Error(
        `[foldkit] Two child Blocks use placement "${childBinding.placement}". Give repeated child Bindings distinct local placements.`,
      )
    }
    seenPlacements.add(childBinding.placement)
    const inspection = inspectBinding(childBinding)

    for (const mount of inspection.mounts) {
      if (!seenMounts.has(mount)) {
        seenMounts.add(mount)
        mounts.push(mount)
      }
    }

    layers.push(inspection.EffectsLayer)
  }

  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  const mergeLayers = Layer.merge as unknown as (
    merged: Layer.Any,
    layer: Layer.Any,
  ) => Layer.Any
  const EffectsLayer = layers.reduce(mergeLayers, Layer.empty)

  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  return {
    subscriptions,
    managedResources,
    mounts,
    EffectsLayer,
  } as unknown as AggregatedChildren<Children>
}
