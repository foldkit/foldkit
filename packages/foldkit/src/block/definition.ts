import {
  Array,
  type Effect,
  type Equivalence,
  Layer,
  type Option,
  Predicate,
  Record,
  type Schema,
  type Scope,
  type Stream,
} from 'effect'

import type { Command } from '../command/index.js'
import {
  type AnyAuthoredView,
  type AnyBlockView,
  type BlockView,
  type Document,
  type DocumentView,
  type HtmlBuilder,
  defineView as defineHtmlView,
} from '../html/index.js'
import * as ManagedResource from '../managedResource/index.js'
import * as Mount from '../mount/index.js'
import * as Subscription from '../subscription/subscription.js'
import type * as Update from '../update/index.js'
import {
  makeResultRecipe,
  resolveOperationOutput,
} from '../update/operationRecipe.js'
import type { VNode } from '../vdom.js'
import { type BindChild, makeBindChild } from './bindChild.js'
import {
  type AggregatedChildren,
  type AnyBinding,
  type BlockOfBinding,
  type InspectionOfBinding,
  type ParentContractOfBinding,
  type RequirementsOfBindings,
  aggregateChildren,
  assertValidBindingOperationNames,
} from './binding.js'
import {
  assertBindingParentContracts,
  descendantOwnersOf,
} from './composition.js'
import { type DefaultViewTypeId, registerDefaultView } from './defaultView.js'
import {
  type DefineCompositionUpdate,
  type ValidateCompositionDelivery,
  makeCompositionUpdate,
} from './delivery.js'
import {
  type DefinitionIdentity,
  LocalMountsTypeId,
  identityOf,
  registerBlockHostIdentities,
  registerDefinition,
} from './identity.js'
import {
  type AnyBindingInitRecipe,
  type BindingInitRecipeReturn,
  isBindingInitRecipe,
  runBindingInitRecipe,
} from './initRecipe.js'
import type {
  CompositionInit,
  ValidateChildStartup,
  ValidateUniqueInitialFields,
} from './initialization.js'
import { makeInit } from './initializationRuntime.js'
import { withOperationGraph } from './operationGraph.js'
import type { Owner } from './owner.js'
import { makeOwnedName } from './ownerName.js'
import type { ValidateBindingPolicies } from './policyEvidence.js'
import type {
  HandlerEvidence,
  HandlerOfHostDefinition,
  HandlerRequirements,
  ValidateComposition,
  ValidateImplementationComposition,
  ValidateUniqueChildPlacements,
} from './requirements.js'
import type { ValidateConstructionRequirements } from './scope.js'
import { selectLayer } from './scope.js'
import { withViewIdentity } from './viewScope.js'

type AnySchema = Schema.Codec<any, any, any, any>
type AnyFunction = (...args: ReadonlyArray<any>) => any

type ReturnOf<Function extends AnyFunction> = Function extends (
  ...args: ReadonlyArray<never>
) => infer Output
  ? Output
  : never
type AnyLayer = Layer.Layer<never, any, any> | Layer.Layer<any, any, any>
type EmptyRecord = Readonly<Record<never, never>>
type AnySubscriptions = Subscription.Subscriptions<any, any, any>
type AnyManagedResources = Readonly<
  Record<string, ManagedResource.Entry<any, any, any, any, any, any, any, any>>
>

type ValidateHandlerConstruction<
  Yielded extends Effect.Effect<unknown, unknown, unknown>,
> = ValidateConstructionRequirements<Effect.Services<Yielded>>

/** @internal Identifies the local Layer recipe before child aggregation. */
export const LocalEffectsLayerTypeId = Symbol('foldkit/Block/LocalEffectsLayer')

export { LocalMountsTypeId } from './identity.js'

type LocalChannels = Readonly<{
  subscriptions: Subscription.Subscriptions<any, any, any>
  managedResources: Readonly<
    Record<string, ManagedResource.ManagedResourceConfig<any, any>>
  >
}>

const localChannels = new WeakMap<object, LocalChannels>()

/** @internal Returns only the lifecycle channels implemented by this block. */
export const localChannelsOf = (block: object): LocalChannels => {
  const channels = localChannels.get(block)
  if (channels === undefined) {
    throw new Error('[foldkit] Block local channels are unavailable.')
  }
  return channels
}

type CommandRequirements<Output> = Output extends unknown
  ? 'commands' extends keyof Output
    ? Output extends Readonly<{ commands?: infer Commands }>
      ? NonNullable<Commands> extends ReadonlyArray<infer Command>
        ? Command extends Readonly<{
            effect: import('effect').Effect.Effect<any, any, infer Requirements>
          }>
          ? Requirements
          : never
        : never
      : never
    : never
  : never

type OutMessageOfReturn<Output> = Output extends unknown
  ? 'outMessage' extends keyof Output
    ? Output extends Readonly<{ outMessage?: infer OutMessage }>
      ? Exclude<OutMessage, undefined>
      : never
    : never
  : never

type CommandMessageOfReturn<Output> = Output extends unknown
  ? 'commands' extends keyof Output
    ? Output extends Readonly<{ commands?: infer Commands }>
      ? NonNullable<Commands> extends ReadonlyArray<infer CommandValue>
        ? CommandValue extends Command<infer CommandMessage, any, any>
          ? CommandMessage
          : never
        : never
      : never
    : never
  : never

type IsAny<Value> = 0 extends 1 & Value ? true : false

type IsUnknown<Value> =
  IsAny<Value> extends true ? false : unknown extends Value ? true : false

type ValidViewInputs<ViewInputs> =
  IsAny<ViewInputs> extends true
    ? never
    : [ViewInputs] extends [never]
      ? never
      : [ViewInputs] extends [void]
        ? never
        : ViewInputs

type ViewWithInputs<Model, Message, ViewInputs, RequiredViewRequirements> = [
  ValidViewInputs<ViewInputs>,
] extends [never]
  ? never
  : (
      model: Model,
      viewInputs: NoInfer<ValidViewInputs<ViewInputs>>,
      h: HtmlBuilder<Message, RequiredViewRequirements>,
    ) => VNode | null

type OwnedReturn<Model, Message, OutMessage> = Readonly<{
  model: Model
  commands?: Update.Commands<Message, any> | undefined
  outMessage?: OutMessage
}>

type HasAnyContext<Context extends ReadonlyArray<unknown>> =
  Context extends readonly []
    ? false
    : Context extends readonly [infer Head, ...infer Tail]
      ? IsAny<Head> extends true
        ? true
        : HasAnyContext<Tail>
      : IsAny<Context[number]>

type ValidateAnnotatedContext<Context extends ReadonlyArray<unknown>> =
  HasAnyContext<Context> extends true
    ? Readonly<{
        'Block context parameters cannot use any': Context
      }>
    : unknown

/** @internal Type-only identity for Application update source evidence. */
export declare const DefinedUpdateSourceTypeId: unique symbol

/** @internal Retains an Application update's source type for root completion. */
export interface DefinedUpdateSource<Source> {
  readonly [DefinedUpdateSourceTypeId]: Source
}

/** The exact update function returned by a Block's `update` authoring helper. */
export type DefinedUpdate<
  Model,
  Message,
  Context extends ReadonlyArray<unknown>,
  OutMessage,
  R,
  Evidence,
> = (
  model: Model,
  message: Message,
  ...context: Context
) => Update.WithRegistrationEvidence<
  [OutMessage] extends [never]
    ? Update.Return<Model, Message, R>
    : Update.ReturnWithOutMessage<Model, Message, OutMessage, R>,
  Evidence
>

/** The exact operation returned by a Block's `step` authoring helper. */
export type DefinedStep<
  Model,
  Message,
  Context extends ReadonlyArray<unknown>,
  OutMessage,
  R,
  Evidence,
  DeferredKind,
> = (
  model: Update.GraphInput<Model, Evidence>,
  ...context: Context
) => IsAny<DeferredKind> extends true
  ? Update.WithRegistrationEvidence<
      [OutMessage] extends [never]
        ? Update.Return<Model, Message, R>
        : Update.ReturnWithOutMessage<Model, Message, OutMessage, R>,
      Evidence
    >
  : DeferredKind extends 'ResultRecipe'
    ? Update.ResultRecipe<Model, Message, OutMessage, R, Evidence>
    : Update.WithRegistrationEvidence<
        [OutMessage] extends [never]
          ? Update.Return<Model, Message, R>
          : Update.ReturnWithOutMessage<Model, Message, OutMessage, R>,
        Evidence
      >

/**
 * @internal Retains an authored view's owner, Model, Message, and registered
 * capabilities in a named type that downstream declarations can preserve.
 */
export type OwnedAuthoredView<
  View,
  OwnerValue,
  Model,
  Message,
  RequiredViewRequirements,
> = Readonly<{
  __blockViewOwner: OwnerValue
  __blockDefinitionView: Readonly<{
    owner: (value: OwnerValue) => OwnerValue
    model: (value: Model) => Model
    message: (value: Message) => Message
    mountRequirements: () => RequiredViewRequirements
  }>
}> &
  View

/**
 * Refines an authored generic view's per-render inputs while preserving its
 * definition owner, Model, Message, and View requirements.
 */
export type RefineViewInputs<View extends AnyBlockView, ViewInputs> =
  View extends Readonly<{
    __blockViewOwner: infer OwnerValue
    __blockDefinitionView: Readonly<{
      model: (value: infer Model) => unknown
      message: (value: infer Message) => unknown
      mountRequirements: () => infer RequiredViewRequirements
    }>
  }>
    ? OwnedAuthoredView<
        BlockView<
          Model,
          Message,
          ValidViewInputs<ViewInputs>,
          RequiredViewRequirements
        >,
        OwnerValue,
        Model,
        Message,
        RequiredViewRequirements
      >
    : never

/**
 * Defines a view against one Block's Model, Message, and View requirements.
 */
export interface DefineView<
  OwnerValue,
  Model,
  Message,
  RequiredViewRequirements,
> {
  (
    view: (
      model: Model,
      h: HtmlBuilder<Message, RequiredViewRequirements>,
    ) => Document,
  ): OwnedAuthoredView<
    DocumentView<Model, Message, RequiredViewRequirements>,
    OwnerValue,
    Model,
    Message,
    RequiredViewRequirements
  >
  (
    view: (
      model: Model,
      h: HtmlBuilder<Message, RequiredViewRequirements>,
    ) => VNode | null,
  ): OwnedAuthoredView<
    BlockView<Model, Message, void, RequiredViewRequirements>,
    OwnerValue,
    Model,
    Message,
    RequiredViewRequirements
  >
  /** Authors a view with explicit parent-owned values or callbacks supplied for
   * each render. View inputs do not become part of the child Model. */
  readonly withInputs: <ViewInputs = never>(
    view: [ValidViewInputs<ViewInputs>] extends [never]
      ? never
      : (
          model: Model,
          viewInputs: NoInfer<ValidViewInputs<ViewInputs>>,
          h: HtmlBuilder<Message, RequiredViewRequirements>,
        ) => VNode | null,
  ) => OwnedAuthoredView<
    BlockView<
      Model,
      Message,
      ValidViewInputs<ViewInputs>,
      RequiredViewRequirements
    >,
    OwnerValue,
    Model,
    Message,
    RequiredViewRequirements
  >
}

/**
 * Defines a named operation that a completed Block can expose to its parent.
 *
 * A callback may return an ordinary update result, a connected Step, or a passive
 * child initialization recipe. Ordinary pure Steps remain directly callable.
 * The helper preserves or wraps connected values and recipes until a matching
 * Composition callback or completed Block exposed operation interprets them
 * under the registered graph.
 */
export interface DefineStep<Model, Message, OutMessage> {
  <
    const Context extends ReadonlyArray<unknown>,
    const Output extends
      | OwnedReturn<Model, Message, OutMessage>
      | AnyFunction
      | AnyBindingInitRecipe
      | Update.AnyResultRecipe,
  >(
    step: ((model: Model, ...context: Context) => Output) &
      ValidateDeferredStepOutput<Model, Message, OutMessage, Output> &
      ValidateAnnotatedContext<Context>,
  ): DefinedStep<
    Model,
    Message,
    Context,
    OutMessageOfReturn<DeferredStepReturn<Output>>,
    CommandRequirements<DeferredStepReturn<Output>>,
    | Update.RegistrationEvidenceOf<DeferredStepReturn<Output>>
    | Update.GraphRequirementOf<Extract<Output, AnyFunction>>,
    DeferredStepKind<Output>
  >
}

type DeferredValueKind<Value> = Value extends
  | Update.AnyResultRecipe
  | AnyBindingInitRecipe
  ? 'ResultRecipe'
  : 'None'

type DeferredStepKind<Output> = Output extends AnyFunction
  ? DeferredValueKind<ReturnType<Output>>
  : DeferredValueKind<Output>

type DeferredValueReturn<Value> = Value extends AnyBindingInitRecipe
  ? BindingInitRecipeReturn<Value>
  : Update.ResolvedOperationOutput<Value>

type DeferredStepReturn<Output> = Output extends AnyFunction
  ? DeferredValueReturn<ReturnType<Output>>
  : DeferredValueReturn<Output>

type ValidateResultRecipe<Model, Message, OutMessage, Value> =
  Value extends Update.ResultRecipe<
    infer ResultModel,
    infer ResultMessage,
    infer ResultOutMessage,
    infer R,
    infer Evidence
  >
    ? true extends
        | IsAny<ResultModel>
        | IsUnknown<ResultModel>
        | IsAny<ResultMessage>
        | IsUnknown<ResultMessage>
        | IsAny<ResultOutMessage>
        | IsUnknown<ResultOutMessage>
        | IsAny<R>
        | IsUnknown<R>
        | IsAny<Evidence>
        | IsUnknown<Evidence>
      ? never
      : [ResultModel, Model] extends [Model, ResultModel]
        ? [ResultMessage] extends [Message]
          ? [ResultOutMessage] extends [OutMessage]
            ? unknown
            : never
          : never
        : never
    : never

type ValidateDeferredValue<Model, Message, OutMessage, Value> =
  Value extends Update.AnyResultRecipe
    ? ValidateResultRecipe<Model, Message, OutMessage, Value>
    : DeferredValueReturn<Value> extends OwnedReturn<Model, Message, OutMessage>
      ? unknown
      : never

type ValidateDeferredStepOutput<Model, Message, OutMessage, Output> =
  Output extends AnyFunction
    ? Parameters<Output> extends readonly [infer Input]
      ? IsAny<Input> extends true
        ? never
        : IsUnknown<Input> extends true
          ? never
          : Update.GraphRequirementOf<Output> extends infer Requirement
            ? IsAny<Requirement> extends true
              ? never
              : IsUnknown<Requirement> extends true
                ? never
                : [Input, Update.GraphInput<Model, Requirement>] extends [
                      Update.GraphInput<Model, Requirement>,
                      Input,
                    ]
                  ? ValidateDeferredValue<
                      Model,
                      Message,
                      OutMessage,
                      ReturnType<Output>
                    >
                  : never
            : never
      : never
    : Output extends AnyBindingInitRecipe
      ? BindingInitRecipeReturn<Output> extends OwnedReturn<
          Model,
          Message,
          OutMessage
        >
        ? unknown
        : never
      : Output extends Update.AnyResultRecipe
        ? ValidateResultRecipe<Model, Message, OutMessage, Output>
        : Output extends OwnedReturn<Model, Message, OutMessage>
          ? unknown
          : never

type EmittedMessage<Messages extends ReadonlyArray<Schema.Top>> =
  Messages[number]['Type']

/** @internal Constrains declared result Schemas to one owner's Message union. */
export type ValidateOwnedMessages<
  Messages extends ReadonlyArray<Schema.Top>,
  Message,
> =
  IsAny<EmittedMessage<Messages>> extends true
    ? never
    : [Exclude<EmittedMessage<Messages>, Message>] extends [never]
      ? unknown
      : never

type SubscriptionLayer<
  Name extends string,
  Dependencies,
  Message,
  Yielded extends Effect.Effect<unknown, unknown, unknown>,
  StreamRequirements,
> = Readonly<{
  layer: Layer.Layer<
    Subscription.Handler<Name, Dependencies, Message>,
    Effect.Error<Yielded>,
    Exclude<StreamRequirements | Effect.Services<Yielded>, Scope.Scope>
  >
}>

type AnyLayeredSubscription<Model, Message> = Readonly<{
  dependenciesSchema: Schema.Schema<any> & {
    readonly fields: Schema.Struct.Fields
  }
  modelToDependencies: (model: Model) => any
  dependenciesToStream: (
    ...args: ReadonlyArray<any>
  ) => Stream.Stream<Message, never, any>
  name: string
  messages: ReadonlyArray<Schema.Top>
  toLayer: AnyFunction
}>

type SubscriptionDependencies<Entry> =
  Entry extends Readonly<{
    dependenciesSchema: Schema.Schema<infer Dependencies>
  }>
    ? Dependencies
    : never

type SubscriptionServices<Entry> =
  Entry extends Readonly<{
    dependenciesToStream: (
      ...args: ReadonlyArray<any>
    ) => Stream.Stream<any, any, infer Services>
  }>
    ? Services
    : never

/** Defines Subscription registries against one Block's Model and Message. */
export interface DefineSubscriptions<Id extends string, Model, Message> {
  <
    Entries extends Readonly<
      Record<string, AnyLayeredSubscription<Model, Message>>
    >,
  >(
    build: (
      entry: OwnedSubscriptionEntryBuilder<Id, Model, Message>,
    ) => Entries,
  ): Readonly<{
    [Key in keyof Entries]: Entries[Key] &
      Subscription.Subscription<
        Model,
        Message,
        SubscriptionDependencies<Entries[Key]>,
        SubscriptionServices<Entries[Key]>
      >
  }>
}

/** Defines locally named Subscription entries for one Block. */
export interface OwnedSubscriptionEntryBuilder<
  Id extends string,
  Model,
  Message,
> {
  <
    const Name extends string,
    const Fields extends Schema.Struct.Fields,
    const Messages extends ReadonlyArray<Schema.Top>,
    StreamRequirements = never,
    Yielded extends Effect.Effect<unknown, unknown, unknown> = Effect.Effect<
      never,
      never,
      never
    >,
  >(
    name: Name extends '' | `${string}/${string}` | `${string}::${string}`
      ? never
      : Name,
    fields: Fields,
    callbacks: Readonly<{
      messages: Messages & ValidateOwnedMessages<NoInfer<Messages>, Message>
      modelToDependencies: (model: Model) => Schema.Struct.Type<NoInfer<Fields>>
      keepAliveEquivalence: Equivalence.Equivalence<
        Schema.Struct.Type<NoInfer<Fields>>
      >
      dependenciesToStream?: never
      handler: (() => Generator<
        Yielded,
        (
          dependencies: Schema.Struct.Type<NoInfer<Fields>>,
          readDependencies: () => Schema.Struct.Type<NoInfer<Fields>>,
        ) => Stream.Stream<
          NoInfer<EmittedMessage<Messages>>,
          never,
          StreamRequirements
        >,
        unknown
      >) &
        ValidateHandlerConstruction<Yielded>
    }>,
  ): Subscription.LayeredEntryWithKeepAlive<
    `${Id}/${Name}`,
    Model,
    EmittedMessage<Messages>,
    Schema.Struct.Type<Fields>,
    Messages
  > &
    SubscriptionLayer<
      `${Id}/${Name}`,
      Schema.Struct.Type<Fields>,
      EmittedMessage<Messages>,
      Yielded,
      StreamRequirements
    >
  <
    const Name extends string,
    const Fields extends Schema.Struct.Fields,
    const Messages extends ReadonlyArray<Schema.Top>,
    StreamRequirements = never,
    Yielded extends Effect.Effect<unknown, unknown, unknown> = Effect.Effect<
      never,
      never,
      never
    >,
  >(
    name: Name extends '' | `${string}/${string}` | `${string}::${string}`
      ? never
      : Name,
    fields: Fields,
    callbacks: Readonly<{
      messages: Messages & ValidateOwnedMessages<NoInfer<Messages>, Message>
      modelToDependencies: (model: Model) => Schema.Struct.Type<NoInfer<Fields>>
      keepAliveEquivalence?: never
      dependenciesToStream?: never
      handler: (() => Generator<
        Yielded,
        (
          dependencies: Schema.Struct.Type<NoInfer<Fields>>,
        ) => Stream.Stream<
          NoInfer<EmittedMessage<Messages>>,
          never,
          StreamRequirements
        >,
        unknown
      >) &
        ValidateHandlerConstruction<Yielded>
    }>,
  ): Subscription.LayeredEntryWithoutKeepAlive<
    `${Id}/${Name}`,
    Model,
    EmittedMessage<Messages>,
    Schema.Struct.Type<Fields>,
    Messages
  > &
    SubscriptionLayer<
      `${Id}/${Name}`,
      Schema.Struct.Type<Fields>,
      EmittedMessage<Messages>,
      Yielded,
      StreamRequirements
    >
  <
    const Name extends string,
    const Messages extends ReadonlyArray<Schema.Top>,
    StreamRequirements = never,
    Yielded extends Effect.Effect<unknown, unknown, unknown> = Effect.Effect<
      never,
      never,
      never
    >,
  >(
    name: Name extends '' | `${string}/${string}` | `${string}::${string}`
      ? never
      : Name,
    config: Readonly<{
      messages: Messages & ValidateOwnedMessages<NoInfer<Messages>, Message>
      dependenciesToStream?: never
      handler: (() => Generator<
        Yielded,
        (
          dependencies: Record<string, never>,
        ) => Stream.Stream<
          NoInfer<EmittedMessage<Messages>>,
          never,
          StreamRequirements
        >,
        unknown
      >) &
        ValidateHandlerConstruction<Yielded>
    }>,
  ): Subscription.LayeredEntryWithoutKeepAlive<
    `${Id}/${Name}`,
    Model,
    EmittedMessage<Messages>,
    Record<string, never>,
    Messages
  > &
    SubscriptionLayer<
      `${Id}/${Name}`,
      Record<string, never>,
      EmittedMessage<Messages>,
      Yielded,
      StreamRequirements
    >
  <const Name extends string, const Messages extends ReadonlyArray<Schema.Top>>(
    name: Name extends '' | `${string}/${string}` | `${string}::${string}`
      ? never
      : Name,
    config: Readonly<{
      messages: Messages & ValidateOwnedMessages<NoInfer<Messages>, Message>
      dependenciesToStream?: never
      handler?: never
    }>,
  ): Subscription.LayeredEntryWithoutKeepAlive<
    `${Id}/${Name}`,
    Model,
    EmittedMessage<Messages>,
    Record<string, never>,
    Messages
  >
  <
    const Name extends string,
    const Fields extends Schema.Struct.Fields,
    const Messages extends ReadonlyArray<Schema.Top>,
  >(
    name: Name extends '' | `${string}/${string}` | `${string}::${string}`
      ? never
      : Name,
    fields: Fields,
    callbacks: Readonly<{
      messages: Messages & ValidateOwnedMessages<NoInfer<Messages>, Message>
      modelToDependencies: (model: Model) => Schema.Struct.Type<NoInfer<Fields>>
      keepAliveEquivalence: Equivalence.Equivalence<
        Schema.Struct.Type<NoInfer<Fields>>
      >
      dependenciesToStream?: never
      handler?: never
    }>,
  ): Subscription.LayeredEntryWithKeepAlive<
    `${Id}/${Name}`,
    Model,
    EmittedMessage<Messages>,
    Schema.Struct.Type<Fields>,
    Messages
  >
  <
    const Name extends string,
    const Fields extends Schema.Struct.Fields,
    const Messages extends ReadonlyArray<Schema.Top>,
  >(
    name: Name extends '' | `${string}/${string}` | `${string}::${string}`
      ? never
      : Name,
    fields: Fields,
    callbacks: Readonly<{
      messages: Messages & ValidateOwnedMessages<NoInfer<Messages>, Message>
      modelToDependencies: (model: Model) => Schema.Struct.Type<NoInfer<Fields>>
      keepAliveEquivalence?: never
      dependenciesToStream?: never
      handler?: never
    }>,
  ): Subscription.LayeredEntryWithoutKeepAlive<
    `${Id}/${Name}`,
    Model,
    EmittedMessage<Messages>,
    Schema.Struct.Type<Fields>,
    Messages
  >
}

type AcquireParams<RequirementsSchema extends Schema.Schema<any>> =
  RequirementsSchema extends Schema.Option<infer ParamsSchema>
    ? ParamsSchema['Type']
    : RequirementsSchema extends Schema.Struct<infer Fields>
      ? Schema.Struct.Type<Fields>
      : RequirementsSchema['Type'] extends Option.Option<infer Params>
        ? Params
        : RequirementsSchema['Type']

/** Defines ManagedResource registries against one Block's Model and Message. */
export interface DefineManagedResources<Id extends string, Model, Message> {
  <
    Entries extends Readonly<
      Record<
        string,
        ManagedResource.Entry<Model, Message, any, any, any, any, any, any>
      >
    >,
  >(
    build: (
      entry: OwnedManagedResourceEntryBuilder<Id, Model, Message>,
    ) => Entries,
  ): Entries
}

/** Defines locally named ManagedResource entries for one Block. */
export interface OwnedManagedResourceEntryBuilder<
  Id extends string,
  Model,
  Message,
> {
  <
    const Name extends string,
    RequirementsSchema extends Schema.Schema<any>,
    Resource extends ManagedResource.ManagedResource<any, any>,
    OnAcquired extends (value: ManagedResource.Value<Resource>) => Message,
    AcquireRequirements = never,
    ReleaseRequirements = never,
    Yielded extends Effect.Effect<unknown, unknown, unknown> = Effect.Effect<
      never,
      never,
      never
    >,
  >(
    name: Name extends '' | `${string}/${string}` | `${string}::${string}`
      ? never
      : Name,
    schema: RequirementsSchema,
    config: Readonly<{
      resource: Resource
      modelToMaybeRequirements: (
        model: Model,
      ) => Schema.Schema.Type<RequirementsSchema>
      onAcquired: OnAcquired
      onReleased: () => Message
      onAcquireError: (error: unknown) => Message
      acquire?: never
      release?: never
      handler: (() => Generator<
        Yielded,
        Readonly<{
          acquire: (
            params: AcquireParams<RequirementsSchema>,
          ) => Effect.Effect<
            NoInfer<ManagedResource.Value<Resource>>,
            unknown,
            AcquireRequirements
          >
          release: (
            value: NoInfer<ManagedResource.Value<Resource>>,
          ) => Effect.Effect<void, unknown, ReleaseRequirements>
        }>,
        unknown
      >) &
        ValidateHandlerConstruction<Yielded>
    }>,
  ): ManagedResource.LayeredEntry<
    `${Id}/${Name}`,
    Model,
    Message,
    Schema.Schema.Type<RequirementsSchema>,
    ManagedResource.Value<Resource>,
    ManagedResource.ServiceOf<Resource>,
    OnAcquired,
    AcquireParams<RequirementsSchema>
  > &
    Readonly<{
      layer: Layer.Layer<
        ManagedResource.Handler<
          `${Id}/${Name}`,
          AcquireParams<RequirementsSchema>,
          ManagedResource.Value<Resource>
        >,
        Effect.Error<Yielded>,
        Exclude<
          AcquireRequirements | ReleaseRequirements | Effect.Services<Yielded>,
          Scope.Scope
        >
      >
    }>
  <
    const Name extends string,
    RequirementsSchema extends Schema.Schema<any>,
    Resource extends ManagedResource.ManagedResource<any, any>,
    OnAcquired extends (value: ManagedResource.Value<Resource>) => Message,
  >(
    name: Name extends '' | `${string}/${string}` | `${string}::${string}`
      ? never
      : Name,
    schema: RequirementsSchema,
    config: Readonly<{
      resource: Resource
      modelToMaybeRequirements: (
        model: Model,
      ) => Schema.Schema.Type<RequirementsSchema>
      onAcquired: OnAcquired
      onReleased: () => Message
      onAcquireError: (error: unknown) => Message
      acquire?: never
      release?: never
      handler?: never
    }>,
  ): ManagedResource.LayeredEntry<
    `${Id}/${Name}`,
    Model,
    Message,
    Schema.Schema.Type<RequirementsSchema>,
    ManagedResource.Value<Resource>,
    ManagedResource.ServiceOf<Resource>,
    OnAcquired,
    AcquireParams<RequirementsSchema>
  >
}

type BindingParentModel<Binding> = [ParentContractOfBinding<Binding>] extends [
  never,
]
  ? Binding extends Readonly<{
      fold: infer Fold extends AnyFunction
    }>
    ? Update.GraphModelOf<Fold>
    : never
  : ParentContractOfBinding<Binding> extends Readonly<{ model: infer Model }>
    ? Model
    : never

type OperationFactoryOutput<Factory> = Factory extends AnyFunction
  ? ReturnOf<Factory> extends infer Operation extends AnyFunction
    ? Update.ResolvedOperationOutput<ReturnOf<Operation>>
    : never
  : never

type BindingOperationFactories<Binding> =
  BlockOfBinding<Binding> extends Readonly<{
    expose: infer ExposedOperations extends Readonly<
      Record<string, AnyFunction>
    >
  }>
    ? {
        [Name in keyof ExposedOperations]: Binding extends Readonly<
          Record<Name, infer Factory>
        >
          ? Factory
          : never
      }[keyof ExposedOperations]
    : never

type BindingOutputs<Binding> =
  Binding extends Readonly<{
    fold: infer Fold extends AnyFunction
  }>
    ?
        | Update.ResolvedOperationOutput<ReturnOf<Fold>>
        | OperationFactoryOutput<BindingOperationFactories<Binding>>
    : never

type InvalidBindingParentModel<Binding, ParentModel> =
  IsAny<BindingParentModel<Binding>> extends true
    ? BindingParentModel<Binding>
    : [BindingParentModel<Binding>, ParentModel] extends [
          ParentModel,
          BindingParentModel<Binding>,
        ]
      ? never
      : BindingParentModel<Binding>

type InvalidChildParentModels<
  Children extends ReadonlyArray<AnyBinding>,
  ParentModel,
> = Children[number] extends infer Binding
  ? InvalidBindingParentModel<Binding, ParentModel>
  : never

type InvalidChildCommandMessages<
  Children extends ReadonlyArray<AnyBinding>,
  ParentMessage,
> = Children[number] extends infer Binding
  ? [ParentContractOfBinding<Binding>] extends [never]
    ? Exclude<CommandMessageOfReturn<BindingOutputs<Binding>>, ParentMessage>
    : ParentContractOfBinding<Binding> extends Readonly<{
          message: infer BindingMessage
        }>
      ? Exclude<BindingMessage, ParentMessage>
      : never
  : never

type InvalidChildOutMessages<
  Children extends ReadonlyArray<AnyBinding>,
  ParentOutMessage,
> = Children[number] extends infer Binding
  ? [ParentContractOfBinding<Binding>] extends [never]
    ? Exclude<OutMessageOfReturn<BindingOutputs<Binding>>, ParentOutMessage>
    : ParentContractOfBinding<Binding> extends Readonly<{
          outMessage: infer BindingOutMessage
        }>
      ? Exclude<BindingOutMessage, ParentOutMessage>
      : never
  : never

/** @internal Checks a registered graph against its owning Model and Messages. */
export type ValidateChildBindings<
  Children extends ReadonlyArray<AnyBinding>,
  ParentModel,
  ParentMessage,
  ParentOutMessage,
> = ValidateBindingPolicies<
  Children,
  ParentModel,
  ParentMessage,
  ParentOutMessage
> &
  ValidateUniqueChildPlacements<Children> &
  ValidateUniqueInitialFields<Children> &
  ValidateCompositionDelivery<Children> &
  ([
    | InvalidChildParentModels<Children, ParentModel>
    | InvalidChildCommandMessages<Children, ParentMessage>
    | InvalidChildOutMessages<Children, ParentOutMessage>,
  ] extends [never]
    ? unknown
    : Readonly<{
        'Block child bindings must match the parent Model, Message, and OutMessage':
          | InvalidChildParentModels<Children, ParentModel>
          | InvalidChildCommandMessages<Children, ParentMessage>
          | InvalidChildOutMessages<Children, ParentOutMessage>
      }>)

type LayerOutput<LayerRecipe> = LayerRecipe extends Layer.Any
  ? Layer.Success<LayerRecipe>
  : never

type LayerError<LayerRecipe> = LayerRecipe extends Layer.Any
  ? Layer.Error<LayerRecipe>
  : never

type LayerInput<LayerRecipe> = LayerRecipe extends Layer.Any
  ? Layer.Services<LayerRecipe>
  : never

type CompleteEffectsLayer<
  EffectsLayer extends AnyLayer,
  Children extends ReadonlyArray<AnyBinding>,
> = Layer.Layer<
  LayerOutput<EffectsLayer | AggregatedChildren<Children>['EffectsLayer']>,
  LayerError<EffectsLayer | AggregatedChildren<Children>['EffectsLayer']>,
  LayerInput<EffectsLayer | AggregatedChildren<Children>['EffectsLayer']>
>

type DefinitionViewRequirements<
  Mounts extends ReadonlyArray<Mount.LayeredMountDefinition>,
  Children extends ReadonlyArray<AnyBinding>,
> = Mount.RequirementsOf<Mounts> | RequirementsOfBindings<Children>

interface NoOutMessage {
  readonly OutMessage?: never
}

interface NoDefaultView {
  readonly [DefaultViewTypeId]?: never
}

type OutMessageSchemaField<OutMessageSchema> =
  OutMessageSchema extends AnySchema
    ? Readonly<{ OutMessage: OutMessageSchema }>
    : NoOutMessage

type ImplementationExposedOperations<Implementation> =
  Implementation extends Readonly<{ expose: infer ExposedOperations }>
    ? ExposedOperations
    : EmptyRecord

type ImplementationSubscriptions<Implementation> =
  Implementation extends Readonly<{ subscriptions: infer Subscriptions }>
    ? Subscriptions
    : EmptyRecord

type ImplementationManagedResources<Implementation> =
  Implementation extends Readonly<{ managedResources: infer ManagedResources }>
    ? ManagedResources
    : EmptyRecord

type ImplementationHostHandlers<Implementation> =
  Implementation extends Readonly<{ hostHandlers: infer HostHandlers }>
    ? HostHandlers
    : readonly []

/**
 * The channels supplied to a Block Composition's `makeBlock` method. The
 * block retains the exact types of the supplied functions,
 * registrations, and local Layer recipe. Check an implementation with
 * `satisfies Implementation<Model, Message, OutMessage>` to retain its inferred
 * service requirements; annotating it with this broad type erases them.
 */
export type Implementation<Model, Message, OutMessage = never> = Readonly<{
  /** Default view authored by the same Composition. Omit it for a headless Block
   * or when every parent supplies an alternate authored view. */
  view?: AnyAuthoredView
  /** Creates the initial child Model and optional Commands. Block init cannot
   * emit an OutMessage. */
  init(...args: ReadonlyArray<unknown>): OwnedReturn<Model, Message, never>
  /** Produces the next child Model and optional Commands or OutMessage for one
   * child Message. */
  update(
    model: Model,
    message: Message,
    ...context: ReadonlyArray<unknown>
  ): OwnedReturn<Model, Message, OutMessage>
  /** Parent-driven named operations that preserve the child's update boundary. */
  expose?: Readonly<
    Record<
      string,
      {
        step(
          model: Model,
          ...context: ReadonlyArray<unknown>
        ): OwnedReturn<Model, Message, OutMessage> | Update.AnyResultRecipe
      }['step']
    >
  >
  /** Subscription entries owned directly by this Block. */
  subscriptions?: Subscription.Subscriptions<Model, Message, any>
  /** ManagedResource entries owned directly by this Block. */
  managedResources?: Readonly<
    Record<
      string,
      ManagedResource.Entry<Model, Message, any, any, any, any, any, any>
    >
  >
  /** The complete local handler recipe for this Block. Child Bindings contribute
   * their recipes automatically. Ordinary Service requirements remain for the
   * application root to provide. */
  EffectsLayer: Layer.Layer<never, any, any> | Layer.Layer<any, any, any>
  /** Handler service contracts intentionally left for the host to provide before
   * the Block is bound into a runnable application. */
  hostHandlers?: ReadonlyArray<unknown>
}>

type DefinitionImplementation<
  ModelSchema extends AnySchema,
  MessageSchema extends AnySchema,
  OutMessageSchema,
> = Implementation<
  ModelSchema['Type'],
  MessageSchema['Type'],
  OutMessageSchema extends AnySchema ? OutMessageSchema['Type'] : never
>

type ExtraImplementationKeys<ImplementationValue> = Exclude<
  keyof ImplementationValue,
  keyof Implementation<any, any, any>
>

type ExactImplementationKeys<ImplementationValue> = [
  ExtraImplementationKeys<ImplementationValue>,
] extends [never]
  ? unknown
  : Readonly<{
      [Key in ExtraImplementationKeys<ImplementationValue>]: never
    }>

type CheckedImplementationValue<ImplementationValue> =
  ImplementationValue extends Readonly<{
    init: infer Init extends AnyFunction
    update: infer UpdateFunction extends AnyFunction
    EffectsLayer: infer EffectsLayer extends AnyLayer
  }>
    ? ImplementationValue &
        Readonly<{
          init: Init
          update: UpdateFunction
          EffectsLayer: EffectsLayer
        }>
    : never

type PublicProducerReturn<Output, Model, Message> = [
  OutMessageOfReturn<Output>,
] extends [never]
  ? Update.Return<Model, Message, CommandRequirements<Output>>
  : Update.ReturnWithOutMessage<
      Model,
      Message,
      OutMessageOfReturn<Output>,
      CommandRequirements<Output>
    >

type PublicProducer<Producer, Model, Message> = Producer extends (
  ...args: infer Args
) => infer Output
  ? [Update.RegistrationEvidenceOf<Output>] extends [never]
    ? Producer
    : (...args: Args) => PublicProducerReturn<Output, Model, Message>
  : never

type PublicExposedProducer<Producer, Model, Message> =
  Producer extends AnyFunction
    ? [Update.GraphRequirementOf<Producer>] extends [never]
      ? PublicProducer<Producer, Model, Message>
      : ReturnType<Producer> extends Update.AnyResultRecipe
        ? (
            model: Model,
            ...context: Parameters<Producer> extends readonly [
              unknown,
              ...infer Context,
            ]
              ? Context
              : readonly []
          ) => PublicProducerReturn<
            Update.ResolvedOperationOutput<ReturnType<Producer>>,
            Model,
            Message
          >
        : ReturnType<Producer> extends AnyBindingInitRecipe
          ? (
              model: Model,
              ...context: Parameters<Producer> extends readonly [
                unknown,
                ...infer Context,
              ]
                ? Context
                : readonly []
            ) => PublicProducerReturn<
              BindingInitRecipeReturn<ReturnType<Producer>>,
              Model,
              Message
            >
          : (
              model: Model,
              ...context: Parameters<Producer> extends readonly [
                unknown,
                ...infer Context,
              ]
                ? Context
                : readonly []
            ) => PublicProducerReturn<ReturnType<Producer>, Model, Message>
    : never

type PublicImplementationValue<Model, Message, ImplementationValue> = Readonly<{
  [Key in keyof ImplementationValue]: Key extends 'init' | 'update'
    ? PublicProducer<ImplementationValue[Key], Model, Message>
    : Key extends 'expose'
      ? ImplementationValue[Key] extends Readonly<Record<string, AnyFunction>>
        ? Readonly<{
            [Step in keyof ImplementationValue[Key]]: PublicExposedProducer<
              ImplementationValue[Key][Step],
              Model,
              Message
            >
          }>
        : ImplementationValue[Key]
      : ImplementationValue[Key]
}>

type DefaultEffectsImplementation<ImplementationValue> = Readonly<{
  [
    Key in keyof ImplementationValue | 'EffectsLayer'
  ]: Key extends 'EffectsLayer'
    ? typeof Layer.empty
    : Key extends keyof ImplementationValue
      ? ImplementationValue[Key]
      : never
}>

type CompletedImplementationValue<ImplementationValue> =
  ImplementationValue extends Readonly<{
    init: AnyFunction
    update: AnyFunction
    EffectsLayer: infer EffectsLayer extends AnyLayer
  }>
    ? ImplementationValue & Readonly<{ EffectsLayer: EffectsLayer }>
    : ImplementationValue extends Readonly<{
          init: AnyFunction
          update: AnyFunction
        }>
      ? DefaultEffectsImplementation<ImplementationValue>
      : never

type ManagedImplementation<
  Init,
  UpdateFunction,
  View,
  ManagedResources,
  EffectsLayer,
> = Readonly<{
  init: Init
  update: UpdateFunction
  view: View
  managedResources: ManagedResources
  EffectsLayer: EffectsLayer
}>

type ManagedSubscriptionImplementation<
  Init,
  UpdateFunction,
  View,
  Subscriptions,
  ManagedResources,
  EffectsLayer,
> = ManagedImplementation<
  Init,
  UpdateFunction,
  View,
  ManagedResources,
  EffectsLayer
> &
  Readonly<{ subscriptions: Subscriptions }>

type ViewImplementation<Init, UpdateFunction, View, EffectsLayer> = Readonly<{
  init: Init
  update: UpdateFunction
  view: View
  EffectsLayer: EffectsLayer
}>

type ViewExposedOperationsImplementation<
  Init,
  UpdateFunction,
  View,
  ExposedOperations,
  EffectsLayer,
> = Readonly<{
  init: Init
  update: UpdateFunction
  view: View
  expose: ExposedOperations
  EffectsLayer: EffectsLayer
}>

type ViewSubscriptionsImplementation<
  Init,
  UpdateFunction,
  View,
  Subscriptions,
  EffectsLayer,
> = Readonly<{
  init: Init
  update: UpdateFunction
  view: View
  subscriptions: Subscriptions
  EffectsLayer: EffectsLayer
}>

type ViewSubscriptionImplementation<
  Init,
  UpdateFunction,
  View,
  Subscriptions,
  EffectsLayer,
  AdditionalImplementation = unknown,
> = ViewSubscriptionsImplementation<
  Init,
  UpdateFunction,
  View,
  Subscriptions,
  EffectsLayer
> &
  AdditionalImplementation

type BasicImplementation<Init, UpdateFunction, EffectsLayer> = Readonly<{
  init: Init
  update: UpdateFunction
  EffectsLayer: EffectsLayer
}>

type ValidateInit<ImplementationValue> =
  ImplementationValue extends Readonly<{ init: infer Init extends AnyFunction }>
    ? [OutMessageOfReturn<ReturnOf<Init>>] extends [never]
      ? unknown
      : Readonly<{
          'Block init cannot emit an OutMessage': OutMessageOfReturn<
            ReturnOf<Init>
          >
        }>
    : unknown

type ViewProperty<View, Key extends PropertyKey> = Key extends keyof View
  ? View[Key]
  : never

/** The authored-view contract accepted by a Composition's completion
 * overloads. */
export type DefinitionAuthoredView<
  OwnerValue,
  Model,
  Message,
  AllowedViewRequirements,
> = AnyAuthoredView &
  Readonly<{
    __blockDefinitionView: Readonly<{
      owner: (value: OwnerValue) => OwnerValue
      model: (value: Model) => Model
      message: (value: Message) => Message
      mountRequirements: () => AllowedViewRequirements
    }>
  }>

/** The authored-view contract derived from one Block Definition and its
 * registered composition graph. */
export type DefinitionView<
  OwnerValue,
  ModelSchema extends AnySchema,
  MessageSchema extends AnySchema,
  Mounts extends ReadonlyArray<Mount.LayeredMountDefinition>,
  Children extends ReadonlyArray<AnyBinding>,
> = DefinitionAuthoredView<
  OwnerValue,
  ModelSchema['Type'],
  MessageSchema['Type'],
  DefinitionViewRequirements<Mounts, Children>
>

type ValidateViewOwner<View, OwnerValue> =
  View extends Readonly<{ __blockViewOwner: infer ViewOwner }>
    ? [ViewOwner, OwnerValue] extends [OwnerValue, ViewOwner]
      ? unknown
      : Readonly<{
          'Block view must be authored by its definition': ViewOwner
        }>
    : Readonly<{
        'Block view must be authored by its definition': View
      }>

type ValidateViewChannels<
  ViewModel,
  ViewMessage,
  RequiredViewRequirements,
  Model,
  Message,
  AllowedViewRequirements,
> = [Model] extends [ViewModel]
  ? [ViewMessage] extends [Message]
    ? [Exclude<RequiredViewRequirements, AllowedViewRequirements>] extends [
        never,
      ]
      ? unknown
      : Readonly<{
          'Block view requires Mounts absent from its definition': Exclude<
            RequiredViewRequirements,
            AllowedViewRequirements
          >
        }>
    : Readonly<{
        'Block view must use the definition Model and Message': ViewMessage
      }>
  : Readonly<{
      'Block view must use the definition Model and Message': ViewModel
    }>

type ValidateView<
  ImplementationValue extends object,
  OwnerValue,
  Model,
  Message,
  AllowedViewRequirements,
> = 'view' extends keyof ImplementationValue
  ? IsAny<ImplementationValue['view']> extends true
    ? Readonly<{
        'Block view cannot use any': never
      }>
    : ValidateViewOwner<ImplementationValue['view'], OwnerValue> &
        ValidateViewChannels<
          ViewProperty<ImplementationValue['view'], '__blockModel'>,
          ViewProperty<ImplementationValue['view'], '__blockMessage'>,
          ViewProperty<ImplementationValue['view'], '__blockMountRequirements'>,
          Model,
          Message,
          AllowedViewRequirements
        >
  : unknown

type ValidateDefinitionView<
  View extends Readonly<{ __blockDefinitionView: unknown }>,
> = unknown extends View
  ? Readonly<{
      'Block view cannot use any': never
    }>
  : unknown

type ValidateViewForDefinition<
  View extends DefinitionView<
    OwnerValue,
    ModelSchema,
    MessageSchema,
    Mounts,
    Children
  >,
  OwnerValue,
  ModelSchema extends AnySchema,
  MessageSchema extends AnySchema,
  Mounts extends ReadonlyArray<Mount.LayeredMountDefinition>,
  Children extends ReadonlyArray<AnyBinding>,
> = ValidateDefinitionView<View>

type ImplementationForValidation<
  OwnerValue,
  ModelSchema extends AnySchema,
  MessageSchema extends AnySchema,
  OutMessageSchema,
  Mounts extends ReadonlyArray<Mount.LayeredMountDefinition>,
  Children extends ReadonlyArray<AnyBinding>,
  ImplementationValue extends Readonly<{
    init: AnyFunction
    update: AnyFunction
    EffectsLayer: AnyLayer
  }>,
> = Readonly<{
  owner: OwnerValue
  Model: ModelSchema
  Message: MessageSchema
  mounts: Mounts
  [LocalMountsTypeId]: Mounts
  childBindings: Children
  init: ImplementationValue['init']
  update: ImplementationValue['update']
  expose: ImplementationExposedOperations<ImplementationValue>
  subscriptions: ImplementationSubscriptions<ImplementationValue>
  managedResources: ImplementationManagedResources<ImplementationValue>
  EffectsLayer: CompleteEffectsLayer<
    ImplementationValue['EffectsLayer'],
    Children
  >
  hostHandlers: ImplementationHostHandlers<ImplementationValue>
}> &
  OutMessageSchemaField<OutMessageSchema>

type MergeLayers<Left extends Layer.Any, Right extends Layer.Any> = Layer.Layer<
  Layer.Success<Left | Right>,
  Layer.Error<Left | Right>,
  Layer.Services<Left | Right>
>

type HostDefinitions<ImplementationValue> =
  ImplementationValue extends Readonly<{
    hostHandlers: infer Definitions extends ReadonlyArray<unknown>
  }>
    ? Definitions[number]
    : never

type ProvidedHandlerContracts<HandlersLayer> = HandlersLayer extends Layer.Any
  ? HandlerRequirements<Layer.Success<HandlersLayer>>
  : never

type MissingProvidedHandlers<ImplementationValue, HandlersLayer> = Exclude<
  HandlerOfHostDefinition<HostDefinitions<ImplementationValue>>,
  ProvidedHandlerContracts<HandlersLayer>
>

type UnexpectedProvidedHandlers<ImplementationValue, HandlersLayer> = Exclude<
  ProvidedHandlerContracts<HandlersLayer>,
  HandlerOfHostDefinition<HostDefinitions<ImplementationValue>>
>

type ValidateProvidedHandlers<ImplementationValue, HandlersLayer> =
  IsAny<ProvidedHandlerContracts<HandlersLayer>> extends true
    ? Readonly<{
        'Block provideHandlers Layer must preserve exact handler contracts': ProvidedHandlerContracts<HandlersLayer>
      }>
    : [
          | MissingProvidedHandlers<ImplementationValue, HandlersLayer>
          | UnexpectedProvidedHandlers<ImplementationValue, HandlersLayer>,
        ] extends [never]
      ? unknown
      : Readonly<{
          'Block provideHandlers Layer must exactly match declared host handlers':
            | MissingProvidedHandlers<ImplementationValue, HandlersLayer>
            | UnexpectedProvidedHandlers<ImplementationValue, HandlersLayer>
        }>

type ProvideHandlerImplementation<
  ImplementationValue extends Readonly<{ EffectsLayer: Layer.Any }>,
  HandlersLayer extends Layer.Any,
> = Readonly<{
  [
    Key in keyof ImplementationValue | 'hostHandlers'
  ]: Key extends 'EffectsLayer'
    ? MergeLayers<ImplementationValue['EffectsLayer'], HandlersLayer>
    : Key extends 'hostHandlers'
      ? readonly []
      : Key extends keyof ImplementationValue
        ? ImplementationValue[Key]
        : never
}>

type SelectedEffectsImplementation<ImplementationValue, SelectedEffectsLayer> =
  Readonly<{
    [Key in keyof ImplementationValue]: Key extends 'EffectsLayer'
      ? SelectedEffectsLayer
      : ImplementationValue[Key]
  }>

interface BlockOperations<
  OwnerValue extends Owner<string>,
  ModelSchema extends Schema.Codec<any, any, any, any>,
  MessageSchema extends Schema.Codec<any, any, any, any>,
  OutMessageSchema extends Schema.Codec<any, any, any, any> | undefined,
  Mounts extends ReadonlyArray<Mount.LayeredMountDefinition>,
  Children extends ReadonlyArray<AnyBinding>,
  ImplementationValue extends Readonly<{
    init: AnyFunction
    update: AnyFunction
    EffectsLayer: AnyLayer
  }>,
> {
  /** Authors an alternate embedded view against this completed Block's fixed
   * child and Mount graph. Parents can select it through a Binding. */
  readonly makeView: DefineView<
    OwnerValue,
    ModelSchema['Type'],
    MessageSchema['Type'],
    DefinitionViewRequirements<Mounts, Children>
  >
  /**
   * Selects a replacement local Layer recipe and retains the selected child
   * graph. The returned block keeps the Owner, operations, lifecycle
   * registrations, and host handler contract. Selection builds no services
   * and never constructs the previous local recipe.
   */
  readonly replaceEffectsLayer: <
    const SelectedEffectsLayer extends
      | Layer.Layer<never, any, any>
      | Layer.Layer<any, any, any>,
  >(
    EffectsLayer: SelectedEffectsLayer &
      ValidateComposition<
        Definition<
          OwnerValue,
          ModelSchema,
          MessageSchema,
          OutMessageSchema,
          Mounts,
          Children
        >,
        Block<
          OwnerValue,
          ModelSchema,
          MessageSchema,
          OutMessageSchema,
          Mounts,
          Children,
          SelectedEffectsImplementation<
            ImplementationValue,
            SelectedEffectsLayer
          >
        >
      >,
  ) => Block<
    OwnerValue,
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    Mounts,
    Children,
    SelectedEffectsImplementation<ImplementationValue, SelectedEffectsLayer>
  >
  /**
   * Supplies the declared host-owned handler services with an ordinary Layer.
   */
  readonly provideHandlers: [
    ImplementationHostHandlers<ImplementationValue>[number],
  ] extends [never]
    ? never
    : <const HandlersLayer extends AnyLayer>(
        HandlersLayer: HandlersLayer &
          ValidateProvidedHandlers<ImplementationValue, HandlersLayer>,
      ) => Block<
        OwnerValue,
        ModelSchema,
        MessageSchema,
        OutMessageSchema,
        Mounts,
        Children,
        ProvideHandlerImplementation<ImplementationValue, HandlersLayer>
      >
}

/**
 * The passive contract produced after a Block definition is completed.
 * It carries every lifecycle registration, Layer recipe, exposed operation, and
 * child binding needed to install the Block in a parent.
 */
type BlockContract<
  OwnerValue extends Owner<string>,
  ModelSchema extends Schema.Codec<any, any, any, any>,
  MessageSchema extends Schema.Codec<any, any, any, any>,
  OutMessageSchema extends Schema.Codec<any, any, any, any> | undefined,
  Mounts extends ReadonlyArray<Mount.LayeredMountDefinition>,
  Children extends ReadonlyArray<AnyBinding>,
  ImplementationValue extends Readonly<{
    init: AnyFunction
    update: AnyFunction
    EffectsLayer: AnyLayer
  }>,
> = Readonly<{
  /** @internal Runtime identity bridge used while lowering child bindings. */
  owner: OwnerValue
  /** Schema for this Block's Model. */
  Model: ModelSchema
  /** Schema for facts handled by this Block's update function. */
  Message: MessageSchema
  /** Local and descendant Mount definitions available when the Block is bound. */
  mounts: readonly [
    ...Mounts,
    ...ReadonlyArray<InspectionOfBinding<Children[number]>['mounts'][number]>,
  ]
  /** @internal Retains the exact Mount definitions owned by this block. */
  [LocalMountsTypeId]: Mounts
  /** Child Bindings registered in this Block's Composition. */
  childBindings: Children
  /** Creates the initial child Model and any Commands. A parent initializes a
   * connected occurrence through its registered Binding's init operation,
   * which constructs the parent Model and retains the lifted Commands. */
  init: ImplementationValue['init']
  /** Produces the next child Model and any Commands or OutMessage for one child
   * Message. Parents invoke this through their Binding's `fold` method. */
  update: ImplementationValue['update']
  /** Parent-driven named operations exposed through each Binding. Each completed
   * operation is a checked executor: it accepts the raw Block Model, activates
   * this completed Block's child graph, and returns the readable result. Its
   * Binding projection instead produces an opaque connected parent result for
   * the registering Composition to consume. */
  expose: ImplementationValue extends Readonly<{
    expose: infer ExposedOperations extends Readonly<
      Record<string, (...args: ReadonlyArray<any>) => any>
    >
  }>
    ? ExposedOperations
    : Readonly<Record<never, never>>
  /** Local and descendant Subscription registrations. A Runtime starts them for
   * active occurrences. */
  subscriptions: (ImplementationValue extends Readonly<{
    subscriptions: infer Subscriptions extends Subscription.Subscriptions<
      any,
      any,
      any
    >
  }>
    ? Subscriptions
    : Readonly<Record<never, never>>) &
    AggregatedChildren<Children>['subscriptions']
  /** Local and descendant ManagedResource registrations. A Runtime acquires
   * them for active occurrences. */
  managedResources: (ImplementationValue extends Readonly<{
    managedResources: infer ManagedResources extends Readonly<
      Record<
        string,
        ManagedResource.Entry<any, any, any, any, any, any, any, any>
      >
    >
  }>
    ? ManagedResources
    : Readonly<Record<never, never>>) &
    AggregatedChildren<Children>['managedResources']
  /** Local and descendant handler recipes. Constructing the Block does not build
   * this Layer; the application Runtime builds the composed graph. */
  EffectsLayer: Layer.Layer<
    Layer.Success<
      | ImplementationValue['EffectsLayer']
      | InspectionOfBinding<Children[number]>['EffectsLayer']
    >,
    Layer.Error<
      | ImplementationValue['EffectsLayer']
      | InspectionOfBinding<Children[number]>['EffectsLayer']
    >,
    Layer.Services<
      | ImplementationValue['EffectsLayer']
      | InspectionOfBinding<Children[number]>['EffectsLayer']
    >
  >
  /** @internal Retains the selected local Layer before child aggregation. */
  [LocalEffectsLayerTypeId]: ImplementationValue['EffectsLayer']
  /** @internal Retains compact unresolved handler evidence for root completion. */
  __blockHandlerRequirements: HandlerEvidence<
    ImplementationValue['EffectsLayer'],
    ImplementationHostHandlers<ImplementationValue>,
    Children
  >
  /** Handler contracts intentionally left for a host to provide before this
   * Block is bound into a runnable application. */
  hostHandlers: ImplementationValue extends Readonly<{
    hostHandlers: infer HostHandlers extends ReadonlyArray<unknown>
  }>
    ? HostHandlers
    : readonly []
}> &
  BlockOperations<
    OwnerValue,
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    Mounts,
    Children,
    ImplementationValue
  >

/**
 * A completed Block with an OutMessage Schema and a default view. The
 * contract retains its exact lifecycle registrations, child graph, Layer
 * recipe, host handler requirements, exposed operations, and view inputs.
 */
export interface CompletedBlockWithViewAndOutMessage<
  OwnerValue extends Owner<string>,
  ModelSchema extends Schema.Codec<any, any, any, any>,
  MessageSchema extends Schema.Codec<any, any, any, any>,
  OutMessageSchema extends Schema.Codec<any, any, any, any>,
  Mounts extends ReadonlyArray<Mount.LayeredMountDefinition>,
  Children extends ReadonlyArray<AnyBinding>,
  ImplementationValue extends Readonly<{
    init: AnyFunction
    update: AnyFunction
    view: AnyAuthoredView
    EffectsLayer: AnyLayer
  }>,
> extends BlockContract<
  OwnerValue,
  ModelSchema,
  MessageSchema,
  OutMessageSchema,
  Mounts,
  Children,
  ImplementationValue
> {
  readonly OutMessage: OutMessageSchema
  readonly [DefaultViewTypeId]: ImplementationValue['view']
}

/**
 * A completed Block with a default view and no OutMessage Schema. The
 * contract retains its exact lifecycle registrations, child graph, Layer
 * recipe, host handler requirements, exposed operations, and view inputs.
 */
export interface CompletedBlockWithView<
  OwnerValue extends Owner<string>,
  ModelSchema extends Schema.Codec<any, any, any, any>,
  MessageSchema extends Schema.Codec<any, any, any, any>,
  Mounts extends ReadonlyArray<Mount.LayeredMountDefinition>,
  Children extends ReadonlyArray<AnyBinding>,
  ImplementationValue extends Readonly<{
    init: AnyFunction
    update: AnyFunction
    view: AnyAuthoredView
    EffectsLayer: AnyLayer
  }>,
>
  extends
    BlockContract<
      OwnerValue,
      ModelSchema,
      MessageSchema,
      undefined,
      Mounts,
      Children,
      ImplementationValue
    >,
    NoOutMessage {
  readonly [DefaultViewTypeId]: ImplementationValue['view']
}

/**
 * A completed Block with an OutMessage Schema and no default view. The
 * contract retains its exact lifecycle registrations, child graph, Layer
 * recipe, host handler requirements, and exposed operations.
 */
export interface CompletedBlockWithOutMessage<
  OwnerValue extends Owner<string>,
  ModelSchema extends Schema.Codec<any, any, any, any>,
  MessageSchema extends Schema.Codec<any, any, any, any>,
  OutMessageSchema extends Schema.Codec<any, any, any, any>,
  Mounts extends ReadonlyArray<Mount.LayeredMountDefinition>,
  Children extends ReadonlyArray<AnyBinding>,
  ImplementationValue extends Readonly<{
    init: AnyFunction
    update: AnyFunction
    EffectsLayer: AnyLayer
  }>,
>
  extends
    BlockContract<
      OwnerValue,
      ModelSchema,
      MessageSchema,
      OutMessageSchema,
      Mounts,
      Children,
      ImplementationValue
    >,
    NoDefaultView {
  readonly OutMessage: OutMessageSchema
}

/**
 * A completed Block with neither an OutMessage Schema nor a default view. The
 * contract retains its exact lifecycle registrations, child graph, Layer
 * recipe, host handler requirements, and exposed operations.
 */
export interface CompletedBlockWithoutViewOrOutMessage<
  OwnerValue extends Owner<string>,
  ModelSchema extends Schema.Codec<any, any, any, any>,
  MessageSchema extends Schema.Codec<any, any, any, any>,
  Mounts extends ReadonlyArray<Mount.LayeredMountDefinition>,
  Children extends ReadonlyArray<AnyBinding>,
  ImplementationValue extends Readonly<{
    init: AnyFunction
    update: AnyFunction
    EffectsLayer: AnyLayer
  }>,
>
  extends
    BlockContract<
      OwnerValue,
      ModelSchema,
      MessageSchema,
      undefined,
      Mounts,
      Children,
      ImplementationValue
    >,
    NoOutMessage,
    NoDefaultView {}

type CompletedArguments<DefinitionValue, ImplementationValue> =
  DefinitionValue extends Readonly<{
    owner: infer OwnerValue extends Owner<string>
    Model: infer ModelSchema extends AnySchema
    Message: infer MessageSchema extends AnySchema
    OutMessage: infer OutMessageSchema extends AnySchema
    [LocalMountsTypeId]: infer Mounts extends
      ReadonlyArray<Mount.LayeredMountDefinition>
    childBindings: infer Children extends ReadonlyArray<AnyBinding>
  }>
    ? CompletedImplementationValue<ImplementationValue> extends infer CompletedImplementation extends
        Readonly<{
          init: AnyFunction
          update: AnyFunction
          view: AnyAuthoredView
          EffectsLayer: AnyLayer
        }>
      ? Readonly<{
          OwnerValue: OwnerValue
          ModelSchema: ModelSchema
          MessageSchema: MessageSchema
          OutMessageSchema: OutMessageSchema
          Mounts: Mounts
          Children: Children
          ImplementationValue: PublicImplementationValue<
            ModelSchema['Type'],
            MessageSchema['Type'],
            CompletedImplementation
          >
        }>
      : never
    : never

type CompletedArgument<
  DefinitionValue,
  ImplementationValue,
  Key extends keyof CompletedArguments<DefinitionValue, ImplementationValue>,
> = CompletedArguments<DefinitionValue, ImplementationValue>[Key]

/**
 * A completed Block derived from a Definition and implementation that both
 * publish an OutMessage Schema and a default view.
 */
export interface CompletedWithViewAndOutMessage<
  DefinitionValue,
  ImplementationValue,
> extends CompletedBlockWithViewAndOutMessage<
  CompletedArgument<DefinitionValue, ImplementationValue, 'OwnerValue'>,
  CompletedArgument<DefinitionValue, ImplementationValue, 'ModelSchema'>,
  CompletedArgument<DefinitionValue, ImplementationValue, 'MessageSchema'>,
  CompletedArgument<DefinitionValue, ImplementationValue, 'OutMessageSchema'>,
  CompletedArgument<DefinitionValue, ImplementationValue, 'Mounts'>,
  CompletedArgument<DefinitionValue, ImplementationValue, 'Children'>,
  CompletedArgument<DefinitionValue, ImplementationValue, 'ImplementationValue'>
> {}

/**
 * The passive contract produced after a Block definition is completed.
 * It carries every lifecycle registration, Layer recipe, exposed operation, and
 * child binding needed to install the Block in a parent.
 */
export type Block<
  OwnerValue extends Owner<string>,
  ModelSchema extends Schema.Codec<any, any, any, any>,
  MessageSchema extends Schema.Codec<any, any, any, any>,
  OutMessageSchema extends Schema.Codec<any, any, any, any> | undefined,
  Mounts extends ReadonlyArray<Mount.LayeredMountDefinition>,
  Children extends ReadonlyArray<AnyBinding>,
  ImplementationValue extends Readonly<{
    init: AnyFunction
    update: AnyFunction
    EffectsLayer: AnyLayer
  }>,
> = BlockContract<
  OwnerValue,
  ModelSchema,
  MessageSchema,
  OutMessageSchema,
  Mounts,
  Children,
  ImplementationValue
> &
  (OutMessageSchema extends Schema.Codec<any, any, any, any>
    ? Readonly<{ OutMessage: OutMessageSchema }>
    : NoOutMessage) &
  (ImplementationValue extends Readonly<{ view: AnyAuthoredView }>
    ? Readonly<{
        [DefaultViewTypeId]: ImplementationValue['view']
      }>
    : NoDefaultView)

/**
 * Selects the completed Block contract for the Definition's OutMessage and
 * default view capabilities.
 */
export type CompletedBlock<
  OwnerValue extends Owner<string>,
  ModelSchema extends Schema.Codec<any, any, any, any>,
  MessageSchema extends Schema.Codec<any, any, any, any>,
  OutMessageSchema extends Schema.Codec<any, any, any, any> | undefined,
  Mounts extends ReadonlyArray<Mount.LayeredMountDefinition>,
  Children extends ReadonlyArray<AnyBinding>,
  ImplementationValue extends Readonly<{
    init: AnyFunction
    update: AnyFunction
    EffectsLayer: AnyLayer
  }>,
> = Block<
  OwnerValue,
  ModelSchema,
  MessageSchema,
  OutMessageSchema,
  Mounts,
  Children,
  ImplementationValue
>

/**
 * The completed Block produced by a Composition's `makeBlock` method.
 * It derives the exact graph and implementation channels from the Definition
 * and implementation values.
 */
export type Completed<DefinitionValue, ImplementationValue> =
  DefinitionValue extends Readonly<{
    owner: infer OwnerValue extends Owner<string>
    Model: infer ModelSchema extends AnySchema
    Message: infer MessageSchema extends AnySchema
    [LocalMountsTypeId]: infer Mounts extends
      ReadonlyArray<Mount.LayeredMountDefinition>
    childBindings: infer Children extends ReadonlyArray<AnyBinding>
  }>
    ? CompletedImplementationValue<ImplementationValue> extends infer CompletedImplementation extends
        Readonly<{
          init: AnyFunction
          update: AnyFunction
          EffectsLayer: AnyLayer
        }>
      ? CompletedBlock<
          OwnerValue,
          ModelSchema,
          MessageSchema,
          DefinitionValue extends Readonly<{
            OutMessage: infer OutMessageSchema extends AnySchema
          }>
            ? OutMessageSchema
            : undefined,
          Mounts,
          Children,
          PublicImplementationValue<
            ModelSchema['Type'],
            MessageSchema['Type'],
            CompletedImplementation
          >
        >
      : never
    : never

/** @internal Retains operation evidence while validating an application root. */
export type CompletedForValidation<DefinitionValue, ImplementationValue> =
  DefinitionValue extends Readonly<{
    owner: infer OwnerValue extends Owner<string>
    Model: infer ModelSchema extends AnySchema
    Message: infer MessageSchema extends AnySchema
    [LocalMountsTypeId]: infer Mounts extends
      ReadonlyArray<Mount.LayeredMountDefinition>
    childBindings: infer Children extends ReadonlyArray<AnyBinding>
  }>
    ? CompletedImplementationValue<ImplementationValue> extends infer CompletedImplementation extends
        Readonly<{
          init: AnyFunction
          update: AnyFunction
          EffectsLayer: AnyLayer
        }>
      ? Block<
          OwnerValue,
          ModelSchema,
          MessageSchema,
          DefinitionValue extends Readonly<{
            OutMessage: infer OutMessageSchema extends AnySchema
          }>
            ? OutMessageSchema
            : undefined,
          Mounts,
          Children,
          CompletedImplementation
        >
      : never
    : never

/**
 * Structural bound for any completed Block.
 */
export type AnyBlock = Readonly<{
  owner: Owner<any>
  Model: AnySchema
  Message: AnySchema
  mounts: ReadonlyArray<Mount.LayeredMountDefinition>
  [LocalMountsTypeId]: ReadonlyArray<Mount.LayeredMountDefinition>
  childBindings: ReadonlyArray<AnyBinding>
  init: AnyFunction
  update: AnyFunction
  expose: Readonly<Record<string, AnyFunction>>
  subscriptions: AnySubscriptions
  managedResources: AnyManagedResources
  EffectsLayer: AnyLayer
  [LocalEffectsLayerTypeId]: AnyLayer
  __blockHandlerRequirements?: unknown
  hostHandlers: ReadonlyArray<unknown>
  makeView: AnyFunction
  [DefaultViewTypeId]?: AnyAuthoredView
  OutMessage?: AnySchema
  replaceEffectsLayer: AnyFunction
  provideHandlers: AnyFunction
}>

type ManagedExposedOperationsImplementation<
  Init,
  UpdateFunction,
  View,
  ManagedResources,
  ExposedOperations,
  EffectsLayer,
> = ManagedImplementation<
  Init,
  UpdateFunction,
  View,
  ManagedResources,
  EffectsLayer
> &
  Readonly<{ expose: ExposedOperations }>

type MakeBlockDefinition<
  OwnerValue extends Owner<string>,
  ModelSchema extends AnySchema,
  MessageSchema extends AnySchema,
  OutMessageSchema extends AnySchema | undefined,
  Mounts extends ReadonlyArray<Mount.LayeredMountDefinition>,
  Children extends ReadonlyArray<AnyBinding>,
> = Definition<
  OwnerValue,
  ModelSchema,
  MessageSchema,
  OutMessageSchema,
  Mounts,
  Children
>

type MakeBlockCompositionForValidation<
  OwnerValue extends Owner<string>,
  ModelSchema extends AnySchema,
  MessageSchema extends AnySchema,
  OutMessageSchema extends AnySchema | undefined,
  Mounts extends ReadonlyArray<Mount.LayeredMountDefinition>,
  Children extends ReadonlyArray<AnyBinding>,
  ImplementationValue,
> = ImplementationForValidation<
  OwnerValue,
  ModelSchema,
  MessageSchema,
  OutMessageSchema,
  Mounts,
  Children,
  CheckedImplementationValue<ImplementationValue>
>

type ValidateMakeBlockComposition<
  OwnerValue extends Owner<string>,
  ModelSchema extends AnySchema,
  MessageSchema extends AnySchema,
  OutMessageSchema extends AnySchema | undefined,
  Mounts extends ReadonlyArray<Mount.LayeredMountDefinition>,
  Children extends ReadonlyArray<AnyBinding>,
  ImplementationValue,
> = ValidateImplementationComposition<
  MakeBlockDefinition<
    OwnerValue,
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    Mounts,
    Children
  >,
  MakeBlockCompositionForValidation<
    OwnerValue,
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    Mounts,
    Children,
    ImplementationValue
  >
>

type PublicMakeBlockImplementation<
  ModelSchema extends AnySchema,
  MessageSchema extends AnySchema,
  ImplementationValue,
> = PublicImplementationValue<
  ModelSchema['Type'],
  MessageSchema['Type'],
  CheckedImplementationValue<ImplementationValue>
>

/** Completes a Composition with its implementation channels and returns a
 * passive Block. Completion does not build Layers, run init, or start lifecycle
 * work. `EffectsLayer` contains the Block's local handler recipes; child
 * Bindings contribute their recipes automatically, and ordinary Service
 * requirements remain for the application root to provide. */
export interface MakeBlock<
  OwnerValue extends Owner<string>,
  ModelSchema extends Schema.Codec<any, any, any, any>,
  MessageSchema extends Schema.Codec<any, any, any, any>,
  OutMessageSchema extends Schema.Codec<any, any, any, any> | undefined,
  Mounts extends ReadonlyArray<Mount.LayeredMountDefinition>,
  Children extends ReadonlyArray<AnyBinding>,
> {
  <const Init, const UpdateFunction, const EffectsLayer>(
    implementation: Readonly<{
      init: Init &
        NoInfer<
          ValidateInit<BasicImplementation<Init, UpdateFunction, EffectsLayer>>
        >
      update: UpdateFunction
      view?: never
      subscriptions?: never
      managedResources?: never
      expose?: never
      hostHandlers?: never
      EffectsLayer: EffectsLayer &
        NoInfer<
          ValidateMakeBlockComposition<
            OwnerValue,
            ModelSchema,
            MessageSchema,
            OutMessageSchema,
            Mounts,
            Children,
            BasicImplementation<Init, UpdateFunction, EffectsLayer>
          >
        >
    }> &
      NoInfer<
        DefinitionImplementation<ModelSchema, MessageSchema, OutMessageSchema>
      >,
  ): CompletedBlock<
    OwnerValue,
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    Mounts,
    Children,
    PublicMakeBlockImplementation<
      ModelSchema,
      MessageSchema,
      BasicImplementation<Init, UpdateFunction, EffectsLayer>
    >
  >
  <
    const Init,
    const UpdateFunction,
    const View extends DefinitionView<
      OwnerValue,
      ModelSchema,
      MessageSchema,
      Mounts,
      Children
    >,
    const EffectsLayer,
  >(
    implementation: Readonly<{
      init: Init &
        NoInfer<
          ValidateInit<
            ViewImplementation<Init, UpdateFunction, View, EffectsLayer>
          >
        >
      update: UpdateFunction
      view: View
      subscriptions?: never
      managedResources?: never
      expose?: never
      hostHandlers?: never
      EffectsLayer: EffectsLayer &
        NoInfer<
          ValidateMakeBlockComposition<
            OwnerValue,
            ModelSchema,
            MessageSchema,
            OutMessageSchema,
            Mounts,
            Children,
            ViewImplementation<Init, UpdateFunction, View, EffectsLayer>
          >
        >
    }> &
      NoInfer<
        ValidateViewForDefinition<
          View,
          OwnerValue,
          ModelSchema,
          MessageSchema,
          Mounts,
          Children
        >
      > &
      NoInfer<
        DefinitionImplementation<ModelSchema, MessageSchema, OutMessageSchema>
      >,
  ): CompletedBlock<
    OwnerValue,
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    Mounts,
    Children,
    PublicMakeBlockImplementation<
      ModelSchema,
      MessageSchema,
      ViewImplementation<Init, UpdateFunction, View, EffectsLayer>
    >
  >
  <
    const Init,
    const UpdateFunction,
    const View extends DefinitionView<
      OwnerValue,
      ModelSchema,
      MessageSchema,
      Mounts,
      Children
    >,
    const Subscriptions,
    const EffectsLayer,
  >(
    implementation: Readonly<{
      init: Init &
        NoInfer<
          ValidateInit<
            ViewSubscriptionsImplementation<
              Init,
              UpdateFunction,
              View,
              Subscriptions,
              EffectsLayer
            >
          >
        >
      update: UpdateFunction
      view: View
      subscriptions: Subscriptions
      managedResources?: never
      expose?: never
      hostHandlers?: never
      EffectsLayer: EffectsLayer &
        NoInfer<
          ValidateMakeBlockComposition<
            OwnerValue,
            ModelSchema,
            MessageSchema,
            OutMessageSchema,
            Mounts,
            Children,
            ViewSubscriptionsImplementation<
              Init,
              UpdateFunction,
              View,
              Subscriptions,
              EffectsLayer
            >
          >
        >
    }> &
      NoInfer<
        ValidateViewForDefinition<
          View,
          OwnerValue,
          ModelSchema,
          MessageSchema,
          Mounts,
          Children
        >
      > &
      NoInfer<
        DefinitionImplementation<ModelSchema, MessageSchema, OutMessageSchema>
      >,
  ): CompletedBlock<
    OwnerValue,
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    Mounts,
    Children,
    PublicMakeBlockImplementation<
      ModelSchema,
      MessageSchema,
      ViewSubscriptionsImplementation<
        Init,
        UpdateFunction,
        View,
        Subscriptions,
        EffectsLayer
      >
    >
  >
  <
    const Init,
    const UpdateFunction,
    const View extends DefinitionView<
      OwnerValue,
      ModelSchema,
      MessageSchema,
      Mounts,
      Children
    >,
    const Subscriptions,
    const EffectsLayer,
    const AdditionalImplementation extends object,
  >(
    implementation: AdditionalImplementation &
      Readonly<{
        init: Init &
          NoInfer<
            ValidateInit<
              ViewSubscriptionImplementation<
                Init,
                UpdateFunction,
                View,
                Subscriptions,
                EffectsLayer,
                AdditionalImplementation
              >
            >
          >
        update: UpdateFunction
        view: View
        subscriptions: Subscriptions
        EffectsLayer: EffectsLayer &
          NoInfer<
            ValidateMakeBlockComposition<
              OwnerValue,
              ModelSchema,
              MessageSchema,
              OutMessageSchema,
              Mounts,
              Children,
              ViewSubscriptionImplementation<
                Init,
                UpdateFunction,
                View,
                Subscriptions,
                EffectsLayer,
                AdditionalImplementation
              >
            >
          >
      }> &
      NoInfer<
        ValidateViewForDefinition<
          View,
          OwnerValue,
          ModelSchema,
          MessageSchema,
          Mounts,
          Children
        >
      > &
      NoInfer<
        DefinitionImplementation<ModelSchema, MessageSchema, OutMessageSchema>
      >,
  ): CompletedBlock<
    OwnerValue,
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    Mounts,
    Children,
    PublicMakeBlockImplementation<
      ModelSchema,
      MessageSchema,
      ViewSubscriptionImplementation<
        Init,
        UpdateFunction,
        View,
        Subscriptions,
        EffectsLayer,
        AdditionalImplementation
      >
    >
  >
  <const ImplementationValue extends object>(
    implementation: ImplementationValue &
      NoInfer<
        Omit<
          Implementation<
            ModelSchema['Type'],
            MessageSchema['Type'],
            OutMessageSchema extends Schema.Codec<any, any, any, any>
              ? OutMessageSchema['Type']
              : never
          >,
          'EffectsLayer'
        > &
          Readonly<{ EffectsLayer?: never }>
      > &
      ExactImplementationKeys<ImplementationValue> &
      ValidateInit<ImplementationValue> &
      ValidateView<
        ImplementationValue,
        OwnerValue,
        ModelSchema['Type'],
        MessageSchema['Type'],
        DefinitionViewRequirements<Mounts, Children>
      > &
      ValidateMakeBlockComposition<
        OwnerValue,
        ModelSchema,
        MessageSchema,
        OutMessageSchema,
        Mounts,
        Children,
        DefaultEffectsImplementation<ImplementationValue>
      >,
  ): CompletedBlock<
    OwnerValue,
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    Mounts,
    Children,
    PublicMakeBlockImplementation<
      ModelSchema,
      MessageSchema,
      DefaultEffectsImplementation<ImplementationValue>
    >
  >
  <
    const ErasedImplementation extends Implementation<
      ModelSchema['Type'],
      MessageSchema['Type'],
      OutMessageSchema extends Schema.Codec<any, any, any, any>
        ? OutMessageSchema['Type']
        : never
    >,
  >(
    implementation: ErasedImplementation &
      (Implementation<
        ModelSchema['Type'],
        MessageSchema['Type'],
        OutMessageSchema extends Schema.Codec<any, any, any, any>
          ? OutMessageSchema['Type']
          : never
      > extends ErasedImplementation
        ? unknown
        : never),
  ): never
  <const ImplementationValue extends object>(
    implementation: ImplementationValue &
      NoInfer<
        Implementation<
          ModelSchema['Type'],
          MessageSchema['Type'],
          OutMessageSchema extends Schema.Codec<any, any, any, any>
            ? OutMessageSchema['Type']
            : never
        >
      > &
      ExactImplementationKeys<ImplementationValue> &
      ValidateInit<ImplementationValue> &
      ValidateView<
        ImplementationValue,
        OwnerValue,
        ModelSchema['Type'],
        MessageSchema['Type'],
        DefinitionViewRequirements<Mounts, Children>
      > &
      ValidateMakeBlockComposition<
        OwnerValue,
        ModelSchema,
        MessageSchema,
        OutMessageSchema,
        Mounts,
        Children,
        ImplementationValue
      >,
  ): CompletedBlock<
    OwnerValue,
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    Mounts,
    Children,
    PublicMakeBlockImplementation<
      ModelSchema,
      MessageSchema,
      ImplementationValue
    >
  >
  <
    const Init,
    const UpdateFunction,
    const View extends DefinitionView<
      OwnerValue,
      ModelSchema,
      MessageSchema,
      Mounts,
      Children
    >,
    const ManagedResources,
    const ExposedOperations,
    const EffectsLayer,
  >(
    implementation: Readonly<{
      init: Init &
        NoInfer<
          ValidateInit<
            ManagedExposedOperationsImplementation<
              Init,
              UpdateFunction,
              View,
              ManagedResources,
              ExposedOperations,
              EffectsLayer
            >
          >
        >
      update: UpdateFunction
      view: View
      managedResources: ManagedResources
      expose: ExposedOperations
      EffectsLayer: EffectsLayer &
        NoInfer<
          ValidateMakeBlockComposition<
            OwnerValue,
            ModelSchema,
            MessageSchema,
            OutMessageSchema,
            Mounts,
            Children,
            ManagedExposedOperationsImplementation<
              Init,
              UpdateFunction,
              View,
              ManagedResources,
              ExposedOperations,
              EffectsLayer
            >
          >
        >
    }> &
      NoInfer<
        ValidateViewForDefinition<
          View,
          OwnerValue,
          ModelSchema,
          MessageSchema,
          Mounts,
          Children
        >
      > &
      NoInfer<
        DefinitionImplementation<ModelSchema, MessageSchema, OutMessageSchema>
      >,
  ): CompletedBlock<
    OwnerValue,
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    Mounts,
    Children,
    PublicMakeBlockImplementation<
      ModelSchema,
      MessageSchema,
      ManagedExposedOperationsImplementation<
        Init,
        UpdateFunction,
        View,
        ManagedResources,
        ExposedOperations,
        EffectsLayer
      >
    >
  >
  <
    const Init,
    const UpdateFunction,
    const View extends DefinitionView<
      OwnerValue,
      ModelSchema,
      MessageSchema,
      Mounts,
      Children
    >,
    const ManagedResources,
    const EffectsLayer,
  >(
    implementation: Readonly<{
      init: Init &
        NoInfer<
          ValidateInit<
            ManagedImplementation<
              Init,
              UpdateFunction,
              View,
              ManagedResources,
              EffectsLayer
            >
          >
        >
      update: UpdateFunction
      view: View
      managedResources: ManagedResources
      EffectsLayer: EffectsLayer &
        NoInfer<
          ValidateMakeBlockComposition<
            OwnerValue,
            ModelSchema,
            MessageSchema,
            OutMessageSchema,
            Mounts,
            Children,
            ManagedImplementation<
              Init,
              UpdateFunction,
              View,
              ManagedResources,
              EffectsLayer
            >
          >
        >
    }> &
      NoInfer<
        ValidateViewForDefinition<
          View,
          OwnerValue,
          ModelSchema,
          MessageSchema,
          Mounts,
          Children
        >
      > &
      NoInfer<
        DefinitionImplementation<ModelSchema, MessageSchema, OutMessageSchema>
      >,
  ): CompletedBlock<
    OwnerValue,
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    Mounts,
    Children,
    PublicMakeBlockImplementation<
      ModelSchema,
      MessageSchema,
      ManagedImplementation<
        Init,
        UpdateFunction,
        View,
        ManagedResources,
        EffectsLayer
      >
    >
  >
  <
    const Init,
    const UpdateFunction,
    const View extends DefinitionView<
      OwnerValue,
      ModelSchema,
      MessageSchema,
      Mounts,
      Children
    >,
    const Subscriptions,
    const ManagedResources,
    const EffectsLayer,
  >(
    implementation: Readonly<{
      init: Init &
        NoInfer<
          ValidateInit<
            ManagedSubscriptionImplementation<
              Init,
              UpdateFunction,
              View,
              Subscriptions,
              ManagedResources,
              EffectsLayer
            >
          >
        >
      update: UpdateFunction
      view: View
      subscriptions: Subscriptions
      managedResources: ManagedResources
      EffectsLayer: EffectsLayer &
        NoInfer<
          ValidateMakeBlockComposition<
            OwnerValue,
            ModelSchema,
            MessageSchema,
            OutMessageSchema,
            Mounts,
            Children,
            ManagedSubscriptionImplementation<
              Init,
              UpdateFunction,
              View,
              Subscriptions,
              ManagedResources,
              EffectsLayer
            >
          >
        >
    }> &
      NoInfer<
        ValidateViewForDefinition<
          View,
          OwnerValue,
          ModelSchema,
          MessageSchema,
          Mounts,
          Children
        >
      > &
      NoInfer<
        DefinitionImplementation<ModelSchema, MessageSchema, OutMessageSchema>
      >,
  ): CompletedBlock<
    OwnerValue,
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    Mounts,
    Children,
    PublicMakeBlockImplementation<
      ModelSchema,
      MessageSchema,
      ManagedSubscriptionImplementation<
        Init,
        UpdateFunction,
        View,
        Subscriptions,
        ManagedResources,
        EffectsLayer
      >
    >
  >
  <
    const Init,
    const UpdateFunction,
    const View extends DefinitionView<
      OwnerValue,
      ModelSchema,
      MessageSchema,
      Mounts,
      Children
    >,
    const ExposedOperations,
    const EffectsLayer,
  >(
    implementation: Readonly<{
      init: Init &
        NoInfer<
          ValidateInit<
            ViewExposedOperationsImplementation<
              Init,
              UpdateFunction,
              View,
              ExposedOperations,
              EffectsLayer
            >
          >
        >
      update: UpdateFunction
      view: View
      expose: ExposedOperations
      EffectsLayer: EffectsLayer &
        NoInfer<
          ValidateMakeBlockComposition<
            OwnerValue,
            ModelSchema,
            MessageSchema,
            OutMessageSchema,
            Mounts,
            Children,
            ViewExposedOperationsImplementation<
              Init,
              UpdateFunction,
              View,
              ExposedOperations,
              EffectsLayer
            >
          >
        >
    }> &
      NoInfer<
        ValidateViewForDefinition<
          View,
          OwnerValue,
          ModelSchema,
          MessageSchema,
          Mounts,
          Children
        >
      > &
      NoInfer<
        DefinitionImplementation<ModelSchema, MessageSchema, OutMessageSchema>
      >,
  ): CompletedBlock<
    OwnerValue,
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    Mounts,
    Children,
    PublicMakeBlockImplementation<
      ModelSchema,
      MessageSchema,
      ViewExposedOperationsImplementation<
        Init,
        UpdateFunction,
        View,
        ExposedOperations,
        EffectsLayer
      >
    >
  >
}

/**
 * The `HtmlBuilder` type supplied by a Block or Application Composition.
 * Pass `typeof SearchComposition` to retain that Composition's Message,
 * registered child, and Mount capabilities in extracted view helpers. This
 * type constructs nothing at runtime.
 *
 * Declare an owner-specific alias immediately after the Composition, such as
 * `SearchViewBuilder` for `SearchComposition`, and export it only when another
 * file uses it. The primary Composition view infers its builder parameter.
 *
 * @typeParam CompositionValue - The type of the Composition returned by a Block
 * or Application Definition's `makeComposition` method.
 */
export type ViewBuilderFor<CompositionValue> =
  CompositionValue extends Readonly<{
    Message: Readonly<{ Type: infer Message }>
    [LocalMountsTypeId]: infer Mounts extends
      ReadonlyArray<Mount.LayeredMountDefinition>
    childBindings: infer Children extends ReadonlyArray<AnyBinding>
  }>
    ? HtmlBuilder<Message, DefinitionViewRequirements<Mounts, Children>>
    : never

/** The passive typed authoring contract created by `Block.define`. A Definition
 * owns local identities and Schemas; call `makeComposition` to register child and
 * Mount capabilities before completing the Block. */
export type Definition<
  OwnerValue extends Owner<string>,
  ModelSchema extends Schema.Codec<any, any, any, any>,
  MessageSchema extends Schema.Codec<any, any, any, any>,
  OutMessageSchema extends Schema.Codec<any, any, any, any> | undefined,
  Mounts extends ReadonlyArray<Mount.LayeredMountDefinition>,
  Children extends ReadonlyArray<AnyBinding>,
  StartupSchema extends AnySchema | undefined = undefined,
> = Readonly<{
  /** @internal Runtime identity shared by the definition and completed block. */
  owner: OwnerValue
  /** Schema for this Block's Model. */
  Model: ModelSchema
  /** Schema for facts handled by this Block's update function. */
  Message: MessageSchema
  /** Mount definitions available after local Mounts and child Bindings are
   * registered in the Composition. */
  mounts: readonly [
    ...Mounts,
    ...ReadonlyArray<InspectionOfBinding<Children[number]>['mounts'][number]>,
  ]
  /** @internal Retains the exact Mount definitions owned by this definition. */
  [LocalMountsTypeId]: Mounts
  /** Child Bindings registered in this Definition's composition graph. */
  childBindings: Children
  /** Authors a parent-driven operation that can be exposed by the completed
   * Block. */
  step: DefineStep<
    ModelSchema['Type'],
    MessageSchema['Type'],
    OutMessageSchema extends Schema.Codec<any, any, any, any>
      ? OutMessageSchema['Type']
      : never
  >
  /** Defines Subscription entries owned directly by this Block. */
  subscriptions: DefineSubscriptions<
    OwnerValue['id'],
    ModelSchema['Type'],
    MessageSchema['Type']
  >
  /** Defines ManagedResource entries owned directly by this Block. */
  managedResources: DefineManagedResources<
    OwnerValue['id'],
    ModelSchema['Type'],
    MessageSchema['Type']
  >
  /** Creates child Bindings fixed to this Definition's parent Model, Message,
   * and OutMessage contracts. */
  bindChild: BindChild<
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    StartupSchema extends AnySchema ? StartupSchema['Type'] : never
  >
  /** Registers the child and Mount graph and returns the Composition used to
   * author its view and complete its Block. */
  makeComposition: MakeComposition<
    OwnerValue,
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    StartupSchema
  >
}> &
  (StartupSchema extends AnySchema
    ? Readonly<{
        /** Schema establishing the shared input type for Binding startup selectors. */
        Startup: StartupSchema
      }>
    : unknown) &
  (OutMessageSchema extends Schema.Codec<any, any, any, any>
    ? Readonly<{ OutMessage: OutMessageSchema }>
    : NoOutMessage)

/** A passive Definition with its child and Mount graph registered. A Composition
 * supplies graph-aware view authoring and Block completion; it does not build
 * Layers or start child lifecycle work. */
export type Composition<
  OwnerValue extends Owner<string>,
  ModelSchema extends AnySchema,
  MessageSchema extends AnySchema,
  OutMessageSchema extends AnySchema | undefined,
  Mounts extends ReadonlyArray<Mount.LayeredMountDefinition>,
  Children extends ReadonlyArray<AnyBinding>,
> = Pick<
  Definition<
    OwnerValue,
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    Mounts,
    Children
  >,
  | 'owner'
  | 'Model'
  | 'Message'
  | 'OutMessage'
  | 'mounts'
  | typeof LocalMountsTypeId
  | 'childBindings'
> & {
  /** Authors startup for this registered graph. The callback supplies shared
   * startup inputs and parent-owned fields; child initialization and ordinary
   * startup Steps are assembled into the complete Model and lifted Commands. */
  readonly makeInit: CompositionInit<
    ModelSchema['Type'],
    MessageSchema['Type'],
    Children
  >
  /** Authors parent transitions while registered child delivery policies route
   * their wrapper Messages through the native Binding folds. */
  readonly makeUpdate: DefineCompositionUpdate<
    ModelSchema['Type'],
    MessageSchema['Type'],
    OutMessageSchema extends AnySchema ? OutMessageSchema['Type'] : never,
    Children
  >
  /** Authors a view against this Composition's Model, Message, local Mounts,
   * and registered child Bindings. */
  readonly makeView: DefineView<
    OwnerValue,
    ModelSchema['Type'],
    MessageSchema['Type'],
    DefinitionViewRequirements<Mounts, Children>
  >
  /** Completes this Composition with its implementation channels and returns
   * a passive Block. */
  readonly makeBlock: MakeBlock<
    OwnerValue,
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    Mounts,
    Children
  >
}

/** Registers the child and Mount graph after the Block's typed operations are
 * authored. Both fields default to empty collections. Child OutMessage policies
 * must return this parent's Steps and declared OutMessages, and every sibling
 * Binding used by a policy must be registered here. */
export interface MakeComposition<
  OwnerValue extends Owner<string>,
  ModelSchema extends AnySchema,
  MessageSchema extends AnySchema,
  OutMessageSchema extends AnySchema | undefined,
  StartupSchema extends AnySchema | undefined = undefined,
> {
  (): Composition<
    OwnerValue,
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    readonly [],
    readonly []
  >
  <
    const Mounts extends ReadonlyArray<Mount.LayeredMountDefinition> =
      readonly [],
    const Children extends ReadonlyArray<AnyBinding> = readonly [],
  >(
    config: Readonly<{
      /** Mount definitions owned directly by this Block. Omitted Mounts default
       * to an empty registry. */
      mounts?: Mounts & Mount.PreciseMountRegistry<Mounts>
      /** Child Bindings registered in this Block's composition graph. Omitted
       * childBindings default to an empty tuple. */
      childBindings?: Children
    }> &
      ValidateChildStartup<
        Children,
        StartupSchema extends AnySchema ? StartupSchema['Type'] : never
      > &
      ValidateChildBindings<
        Children,
        ModelSchema['Type'],
        MessageSchema['Type'],
        OutMessageSchema extends AnySchema ? OutMessageSchema['Type'] : never
      >,
  ): Composition<
    OwnerValue,
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    Mounts,
    Children
  >
}

/** Typed authoring helpers established before the child and Mount graph. Every
 * Definition proceeds through `makeComposition`, including an empty graph. */
export type Base<
  OwnerValue extends Owner<string>,
  ModelSchema extends AnySchema,
  MessageSchema extends AnySchema,
  OutMessageSchema extends AnySchema | undefined,
  StartupSchema extends AnySchema | undefined = undefined,
> = Definition<
  OwnerValue,
  ModelSchema,
  MessageSchema,
  OutMessageSchema,
  readonly [],
  readonly [],
  StartupSchema
>

/** Establishes Model, Message, and optional OutMessage contracts for Block
 * authoring. */
export interface DefineBlock<OwnerValue extends Owner<string>> {
  <
    const ModelSchema extends AnySchema,
    const MessageSchema extends AnySchema,
    const OutMessageSchema extends AnySchema,
    const StartupSchema extends AnySchema | undefined = undefined,
  >(
    config: Readonly<{
      /** Schema for the Block's Model. */
      Model: ModelSchema
      /** Schema for facts the Block's update function handles. */
      Message: MessageSchema
      /** Schema for facts the Block can report to a parent. */
      OutMessage: OutMessageSchema
      /** Shared input Schema for Binding init selectors; this value is not stored in the Model. */
      Startup?: StartupSchema
      mounts?: never
      childBindings?: never
    }>,
  ): Base<
    OwnerValue,
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    StartupSchema
  >
  <
    const ModelSchema extends AnySchema,
    const MessageSchema extends AnySchema,
    const StartupSchema extends AnySchema | undefined = undefined,
  >(
    config: Readonly<{
      /** Schema for the Block's Model. */
      Model: ModelSchema
      /** Schema for facts the Block's update function handles. */
      Message: MessageSchema
      /** Shared input Schema for Binding init selectors; this value is not stored in the Model. */
      Startup?: StartupSchema
      OutMessage?: never
      mounts?: never
      childBindings?: never
    }>,
  ): Base<OwnerValue, ModelSchema, MessageSchema, undefined, StartupSchema>
}

const makeDefineView = <
  OwnerValue extends Owner<any>,
  Model,
  Message,
  RequiredViewRequirements,
>(
  owner: OwnerValue,
  mounts: ReadonlyArray<Mount.LayeredMountDefinition>,
  childBindings: ReadonlyArray<AnyBinding>,
): DefineView<OwnerValue, Model, Message, RequiredViewRequirements> => {
  function defineView(
    view: (
      model: Model,
      h: HtmlBuilder<Message, RequiredViewRequirements>,
    ) => Document,
  ): OwnedAuthoredView<
    DocumentView<Model, Message, RequiredViewRequirements>,
    OwnerValue,
    Model,
    Message,
    RequiredViewRequirements
  >
  function defineView(
    view: (
      model: Model,
      h: HtmlBuilder<Message, RequiredViewRequirements>,
    ) => VNode | null,
  ): OwnedAuthoredView<
    BlockView<Model, Message, void, RequiredViewRequirements>,
    OwnerValue,
    Model,
    Message,
    RequiredViewRequirements
  >
  function defineView(
    view: (
      model: Model,
      h: HtmlBuilder<Message, RequiredViewRequirements>,
    ) => VNode | null | Document,
  ):
    | OwnedAuthoredView<
        BlockView<Model, Message, void, RequiredViewRequirements>,
        OwnerValue,
        Model,
        Message,
        RequiredViewRequirements
      >
    | OwnedAuthoredView<
        DocumentView<Model, Message, RequiredViewRequirements>,
        OwnerValue,
        Model,
        Message,
        RequiredViewRequirements
      > {
    const ownedView = withViewIdentity(owner, mounts, childBindings, view)
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    return defineHtmlView(ownedView as any) as
      | OwnedAuthoredView<
          BlockView<Model, Message, void, RequiredViewRequirements>,
          OwnerValue,
          Model,
          Message,
          RequiredViewRequirements
        >
      | OwnedAuthoredView<
          DocumentView<Model, Message, RequiredViewRequirements>,
          OwnerValue,
          Model,
          Message,
          RequiredViewRequirements
        >
  }

  const withInputs = <ViewInputs = never>(
    view: ViewWithInputs<Model, Message, ViewInputs, RequiredViewRequirements>,
  ): OwnedAuthoredView<
    BlockView<
      Model,
      Message,
      ValidViewInputs<ViewInputs>,
      RequiredViewRequirements
    >,
    OwnerValue,
    Model,
    Message,
    RequiredViewRequirements
  > => {
    const ownedView = withViewIdentity(owner, mounts, childBindings, view)
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    return defineHtmlView(ownedView as any) as OwnedAuthoredView<
      BlockView<
        Model,
        Message,
        ValidViewInputs<ViewInputs>,
        RequiredViewRequirements
      >,
      OwnerValue,
      Model,
      Message,
      RequiredViewRequirements
    >
  }

  defineView.withInputs = withInputs

  return defineView
}

const makeDefineStep = <Model, Message, OutMessage>(): DefineStep<
  Model,
  Message,
  OutMessage
> => {
  function defineStep<
    const Context extends ReadonlyArray<unknown>,
    const Output extends
      | OwnedReturn<Model, Message, OutMessage>
      | AnyFunction
      | AnyBindingInitRecipe
      | Update.AnyResultRecipe,
  >(
    step: ((model: Model, ...context: Context) => Output) &
      ValidateDeferredStepOutput<Model, Message, OutMessage, Output> &
      ValidateAnnotatedContext<Context>,
  ): DefinedStep<
    Model,
    Message,
    Context,
    OutMessageOfReturn<DeferredStepReturn<Output>>,
    CommandRequirements<DeferredStepReturn<Output>>,
    | Update.RegistrationEvidenceOf<DeferredStepReturn<Output>>
    | Update.GraphRequirementOf<Extract<Output, AnyFunction>>,
    DeferredStepKind<Output>
  >
  function defineStep(step: AnyFunction): AnyFunction {
    return (model: unknown, ...context: ReadonlyArray<unknown>) => {
      const output = step(model, ...context)
      const deferred = Predicate.isFunction(output) ? output(model) : output
      return isBindingInitRecipe(deferred)
        ? makeResultRecipe(() => runBindingInitRecipe(deferred))
        : deferred
    }
  }

  return defineStep
}

const makeDefineSubscriptions = <Id extends string, Model, Message>(
  owner: Owner<Id>,
): DefineSubscriptions<Id, Model, Message> =>
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  ((build: AnyFunction) =>
    Subscription.make<Model, Message>()(entry => {
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      const ownedEntry = ((
        name: string,
        fieldsOrConfig: unknown,
        maybeConfig?: unknown,
      ) => {
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
        const qualifiedName = makeOwnedName(owner.id, name as never)
        const definition =
          maybeConfig === undefined
            ? entry(
                qualifiedName,
                /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
                fieldsOrConfig as never,
              )
            : entry(
                qualifiedName,
                /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
                fieldsOrConfig as never,
                /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
                maybeConfig as never,
              )
        registerDefinition(owner, definition, name)
        return definition
      }) as never

      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      return build(ownedEntry) as never
    })) as never

const makeDefineManagedResources =
  <Id extends string, Model, Message>(
    owner: Owner<Id>,
  ): DefineManagedResources<Id, Model, Message> =>
  build =>
    ManagedResource.make<Model, Message>()(entry => {
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      const ownedEntry = ((
        name: string,
        schema: Schema.Schema<any>,
        config: unknown,
      ) => {
        const definition = entry(
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
          makeOwnedName(owner.id, name as never),
          schema,
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
          config as never,
        )
        registerDefinition(owner, definition, name)
        return definition
      }) as never

      return build(ownedEntry)
    })

const mergeMounts = (
  localMounts: ReadonlyArray<Mount.LayeredMountDefinition>,
  childMounts: ReadonlyArray<Mount.LayeredMountDefinition>,
): ReadonlyArray<Mount.LayeredMountDefinition> => {
  const seen = new Set<Mount.LayeredMountDefinition>()
  const mounts: Array<Mount.LayeredMountDefinition> = []

  for (const mount of [...localMounts, ...childMounts]) {
    if (!seen.has(mount)) {
      seen.add(mount)
      mounts.push(mount)
    }
  }

  return Object.freeze(mounts)
}

const assertDistinctManagedResourceOwners = (
  managedResources: Readonly<Record<string, unknown>>,
): void => {
  const owners = new Map<string, string>()

  for (const [registrationKey, entry] of globalThis.Object.entries(
    managedResources,
  )) {
    if (
      !Predicate.isObject(entry) ||
      !Predicate.hasProperty(entry, 'resource')
    ) {
      continue
    }

    const { resource } = entry
    if (
      !Predicate.isObject(resource) ||
      !Predicate.hasProperty(resource, 'key') ||
      !Predicate.isString(resource.key)
    ) {
      continue
    }

    const previous = owners.get(resource.key)
    if (previous !== undefined) {
      throw new Error(
        `[foldkit] Block ManagedResource registrations "${previous}" and "${registrationKey}" share the resource tag "${resource.key}". Bind each ManagedResource owner only once.`,
      )
    }

    owners.set(resource.key, registrationKey)
  }
}

// oxlint-disable effecttsgo/any-unknown-in-error-context
/**
 * @internal Runtime constructor behind {@link DefineBlock}.
 */
export const makeDefinition = (
  owner: Owner<any>,
  config: Readonly<{
    Model: AnySchema
    Message: AnySchema
    OutMessage?: AnySchema
    Startup?: AnySchema
    mounts?: ReadonlyArray<Mount.LayeredMountDefinition>
    childBindings?: ReadonlyArray<AnyBinding>
  }>,
  authoring?: Readonly<{
    step: AnyFunction
    subscriptions: AnyFunction
    managedResources: AnyFunction
  }>,
): any => {
  const localMounts = Object.freeze(globalThis.Array.from(config.mounts ?? []))
  const childBindings = Object.freeze(
    globalThis.Array.from(config.childBindings ?? []),
  )

  const parentContract = {
    ownerToken: owner.token,
    Model: config.Model,
    Message: config.Message,
    OutMessage: config.OutMessage,
    Startup: config.Startup,
  }

  assertBindingParentContracts(parentContract, owner.id, childBindings)

  const childChannels = aggregateChildren(childBindings)
  const mounts = mergeMounts(localMounts, childChannels.mounts)

  const defineView = makeDefineView(owner, localMounts, childBindings)
  const init = makeInit(config.Model, childBindings)
  const update = makeCompositionUpdate(childBindings)
  const defineStep = authoring?.step ?? makeDefineStep()
  const defineSubscriptions =
    authoring?.subscriptions ?? makeDefineSubscriptions(owner)
  const defineManagedResources =
    authoring?.managedResources ?? makeDefineManagedResources(owner)
  const bindChild = makeBindChild<
    typeof config.Model,
    typeof config.Message,
    typeof config.OutMessage
  >(parentContract)
  const emptyExpose: Readonly<Record<string, AnyFunction>> = {}
  const completedExposeBySource = new WeakMap<
    Readonly<Record<string, AnyFunction>>,
    Readonly<Record<string, AnyFunction>>
  >()
  const completeExpose = (
    source: Readonly<Record<string, AnyFunction>>,
  ): Readonly<Record<string, AnyFunction>> => {
    const existing = completedExposeBySource.get(source)
    if (existing !== undefined) {
      return existing
    }

    const completed = Record.map(
      source,
      operation =>
        (model: unknown, ...context: ReadonlyArray<any>) =>
          withOperationGraph(childBindings, () => {
            const output = operation(model, ...context)
            const resolved = resolveOperationOutput(output, model)
            return isBindingInitRecipe(resolved)
              ? runBindingInitRecipe(resolved)
              : resolved
          }),
    )
    completedExposeBySource.set(source, completed)

    return completed
  }

  function makeBlock(
    implementation: {
      readonly view?: AnyAuthoredView
      readonly init: AnyFunction
      readonly update: AnyFunction
      readonly expose?: Readonly<Record<string, AnyFunction>>
      readonly subscriptions?: AnySubscriptions
      readonly managedResources?: AnyManagedResources
      readonly EffectsLayer?: AnyLayer
      readonly hostHandlers?: ReadonlyArray<unknown>
    },
    retainedHostIdentities?: ReadonlyArray<DefinitionIdentity>,
    areHostHandlersProvided = false,
  ): AnyBlock {
    const exposeSource = implementation.expose ?? emptyExpose
    assertValidBindingOperationNames(exposeSource)
    const expose = completeExpose(exposeSource)
    const subscriptions = Subscription.aggregate(
      implementation.subscriptions ?? {},
      childChannels.subscriptions,
    )
    const managedResources = ManagedResource.aggregate(
      implementation.managedResources ?? {},
      childChannels.managedResources,
    )
    const hostIdentities =
      retainedHostIdentities ??
      (implementation.hostHandlers ?? []).map(definition => {
        if (
          definition === null ||
          (typeof definition !== 'object' && typeof definition !== 'function')
        ) {
          throw new Error(
            '[foldkit] Block hostHandlers entries must be Foldkit definitions.',
          )
        }

        const identity = identityOf(definition)
        if (identity === undefined) {
          throw new Error(
            '[foldkit] Block hostHandlers entries must be Layer-backed Foldkit definitions.',
          )
        }

        return identity
      })
    const localEffectsLayer = implementation.EffectsLayer ?? Layer.empty
    const selectedLayer = selectLayer(owner, localEffectsLayer, {
      allowedIdentities: hostIdentities,
      descendantOwners: descendantOwnersOf(childBindings),
      ...(areHostHandlersProvided
        ? {
            requiredIdentities: new Set(
              hostIdentities.map(identity => identity.token),
            ),
          }
        : {}),
    })
    const EffectsLayer = Array.isReadonlyArrayEmpty(childBindings)
      ? selectedLayer
      : Layer.merge(selectedLayer, childChannels.EffectsLayer)
    const hostHandlers = implementation.hostHandlers ?? []

    assertDistinctManagedResourceOwners(managedResources)

    function replaceEffectsLayer(EffectsLayer: AnyLayer): AnyBlock {
      return makeBlock(
        { ...implementation, EffectsLayer },
        hostIdentities,
        areHostHandlersProvided,
      )
    }

    function provideHandlers(HandlersLayer: AnyLayer): AnyBlock {
      return makeBlock(
        {
          ...implementation,
          EffectsLayer: Layer.merge(localEffectsLayer, HandlersLayer),
          hostHandlers: [],
        },
        hostIdentities,
        true,
      )
    }

    const block = {
      owner,
      Model: config.Model,
      Message: config.Message,
      ...(config.OutMessage === undefined
        ? {}
        : { OutMessage: config.OutMessage }),
      makeView: defineView,
      mounts,
      [LocalMountsTypeId]: localMounts,
      childBindings,
      init: implementation.init,
      update: implementation.update,
      expose,
      subscriptions,
      managedResources,
      EffectsLayer,
      hostHandlers,
      [LocalEffectsLayerTypeId]: localEffectsLayer,
      replaceEffectsLayer,
      provideHandlers,
    }

    registerDefaultView(block, implementation.view)
    localChannels.set(block, {
      subscriptions: implementation.subscriptions ?? {},
      managedResources: implementation.managedResources ?? {},
    })
    registerBlockHostIdentities(block, hostIdentities)

    return block
  }

  return {
    owner,
    Model: config.Model,
    Message: config.Message,
    ...(config.Startup === undefined ? {} : { Startup: config.Startup }),
    ...(config.OutMessage === undefined
      ? {}
      : { OutMessage: config.OutMessage }),
    mounts,
    [LocalMountsTypeId]: localMounts,
    childBindings,
    makeView: defineView,
    makeInit: init,
    makeUpdate: update,
    step: defineStep,
    subscriptions: defineSubscriptions,
    managedResources: defineManagedResources,
    bindChild,
    makeBlock,
  }
}
/** @internal Creates a typed definition before its composition graph. */
export const makeBaseDefinition = (
  owner: Owner<any>,
  config: Readonly<{
    Model: AnySchema
    Message: AnySchema
    OutMessage?: AnySchema
    Startup?: AnySchema
  }>,
): any => {
  const base = makeDefinition(owner, config)
  const makeComposition = (
    graph: Readonly<{
      mounts?: ReadonlyArray<Mount.LayeredMountDefinition>
      childBindings?: ReadonlyArray<AnyBinding>
    }> = {},
  ) => {
    const composition = makeDefinition(owner, { ...config, ...graph }, base)

    return {
      owner: composition.owner,
      Model: composition.Model,
      Message: composition.Message,
      ...(composition.OutMessage === undefined
        ? {}
        : { OutMessage: composition.OutMessage }),
      mounts: composition.mounts,
      [LocalMountsTypeId]: composition[LocalMountsTypeId],
      childBindings: composition.childBindings,
      makeInit: composition.makeInit,
      makeUpdate: composition.makeUpdate,
      makeView: composition.makeView,
      makeBlock: composition.makeBlock,
    }
  }

  return {
    owner: base.owner,
    Model: base.Model,
    Message: base.Message,
    ...(base.Startup === undefined ? {} : { Startup: base.Startup }),
    ...(base.OutMessage === undefined ? {} : { OutMessage: base.OutMessage }),
    mounts: base.mounts,
    [LocalMountsTypeId]: base[LocalMountsTypeId],
    childBindings: base.childBindings,
    step: base.step,
    subscriptions: base.subscriptions,
    managedResources: base.managedResources,
    bindChild: base.bindChild,
    makeComposition,
  }
}
// oxlint-enable effecttsgo/any-unknown-in-error-context
