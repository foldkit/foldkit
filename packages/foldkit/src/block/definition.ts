import {
  Array,
  type Effect,
  type Equivalence,
  Layer,
  Option,
  Predicate,
  Record,
  Schema,
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
import type {
  InvalidViewInputsDiagnostic,
  ValidViewInputs,
} from '../html/viewInputs.js'
import * as ManagedResource from '../managedResource/index.js'
import * as Mount from '../mount/index.js'
import * as Subscription from '../subscription/subscription.js'
import type * as Update from '../update/index.js'
import {
  makeResultRecipe,
  resolveOperationOutput,
} from '../update/operationRecipe.js'
import type * as PublicUpdate from '../update/public.js'
import type { VNode } from '../vdom.js'
import {
  type AssemblyDraft,
  type CompletionProof,
  assertCompletedBlock,
  completeDerivedBlock,
  makeAssemblyDraft,
} from './assemblyState.js'
import { type BindChild, makeBindChild } from './bindChild.js'
import {
  type AggregatedChildren,
  type AnyBinding,
  type GeneratedMessageOfRequirement,
  type InspectionOfBinding,
  type ParentContractOfBinding,
  type RequirementsOfBindings,
  type ValidateBindingOperationNames,
  aggregateChildren,
  assertValidBindingOperationNames,
} from './binding.js'
import {
  bindingRequiresOutMessagePolicy,
  selectedBindingOutMessagePolicyOf,
} from './bindingOutMessagePolicy.js'
import {
  type DispatchSchemaFor,
  generatedEnvelopeSchemas,
  makeDispatchSchema,
} from './childEnvelope.js'
import { type MakeCommandsStep, makeCommandsStep } from './commandsStep.js'
import {
  assertBindingParentContracts,
  descendantOwnersOf,
  registerRuntimeBindings,
} from './composition.js'
import { type DefaultViewTypeId, registerDefaultView } from './defaultView.js'
import {
  type AuthoredMessage,
  type CompositionDeliveryArguments,
  type DefineCompositionUpdate,
  type ValidateCompositionDelivery,
  assertLocalOperationMessage,
  assertLocalOperationTag,
  makeCompositionUpdate,
} from './delivery.js'
import {
  type DefineStepFields,
  type DefineStepNoop,
  makeStepFields,
  makeStepNoop,
} from './fieldStep.js'
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
  isRegisteredBindingInitRecipe,
  runBindingInitRecipe,
} from './initRecipe.js'
import type {
  CompositionInit,
  ValidateChildInitContext,
  ValidateUniqueInitialFields,
} from './initialization.js'
import { makeInit } from './initializationRuntime.js'
import { isOperationMessageConstructor, prepareOperation } from './operation.js'
import type { OperationEmission } from './operationEmission.js'
import { withOperationGraph } from './operationGraph.js'
import { makeOperationMessageValidator } from './operationMessage.js'
import type { OperationOutputOf } from './operationOutputs.js'
import {
  type MakeOutMessageFold,
  makeOutMessageFold,
} from './outMessageFold.js'
import {
  type MakeOutMessageForward,
  makeOutMessageForward,
} from './outMessageForward.js'
import {
  type RuntimeOutMessagePolicy,
  registerOperationGraphOutMessagePolicies,
} from './outMessagePolicyRuntime.js'
import {
  type MakeOutMessageStep,
  makeOutMessageStep,
} from './outMessageStep.js'
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
import { registerViewInputs, withViewIdentity } from './viewScope.js'

type AnySchema = Schema.Codec<any, any, any, any>
type AnyFunction = (...args: ReadonlyArray<any>) => any

const compositions = new WeakSet<object>()

/** @internal Tests whether a value is a Composition created by Foldkit. */
export const isComposition = (value: unknown): value is object =>
  (typeof value === 'object' || typeof value === 'function') &&
  value !== null &&
  compositions.has(value)

type ReturnOf<Function extends AnyFunction> = Function extends (
  ...args: ReadonlyArray<never>
) => infer Output
  ? Output
  : never
type AnyLayer = Layer.Layer<never, any, any> | Layer.Layer<any, any, any>
type EmptyRecord = Readonly<Record<never, never>>
type AnySubscriptionEntries = Subscription.Subscriptions<any, any, any>
type AnySubscriptions = AnySubscriptionEntries
type AnySubscriptionInput =
  | AnySubscriptionEntries
  | (Subscription.Registry<AnySubscriptionEntries> &
      Readonly<{ layer?: Layer.Any }>)
type AnyManagedResourceEntries = Readonly<
  Record<string, ManagedResource.Entry<any, any, any, any, any, any, any, any>>
>
type AnyManagedResources = AnyManagedResourceEntries
type AnyManagedResourceInput =
  | AnyManagedResources
  | ManagedResource.Registry<AnyManagedResourceEntries>

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

declare const InvalidViewInputsTypeId: unique symbol

/** @internal Retains invalid generic ViewInputs as a required input instead of
 * allowing `never` to collapse a Block view to its two-argument form. */
export interface InvalidViewInputs<ViewInputs> {
  readonly [InvalidViewInputsTypeId]: ViewInputs
}

/** @internal Preserves deferred generic validation in authored view types. */
export type AuthoredViewInputs<ViewInputs> = [
  ValidViewInputs<ViewInputs>,
] extends [never]
  ? InvalidViewInputs<ViewInputs>
  : ValidViewInputs<ViewInputs>

type ViewWithInputs<Model, Message, ViewInputs, RequiredViewRequirements> =
  IsAny<ViewInputs> extends true
    ? never
    : [ViewInputs] extends [never]
      ? never
      : [ViewInputs] extends [void]
        ? never
        : [ViewInputs] extends [ValidViewInputs<ViewInputs>]
          ? (
              model: Model,
              viewInputs: NoInfer<ViewInputs>,
              h: HtmlBuilder<Message, RequiredViewRequirements>,
            ) => VNode | null
          : ((
              model: Model,
              viewInputs: NoInfer<ViewInputs>,
              h: HtmlBuilder<Message, RequiredViewRequirements>,
            ) => VNode | null) &
              InvalidViewInputsDiagnostic<ViewInputs>

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

type DefinedUpdateReturn<Model, Message, OutMessage, R, Evidence> =
  Update.WithRegistrationEvidence<
    [OutMessage] extends [never]
      ? Update.Return<Model, Message, R>
      : Update.ReturnWithOutMessage<Model, Message, OutMessage, R>,
    Evidence
  >

/** The exact dual update function returned by a Composition's update authoring helper. */
export type DefinedUpdate<
  Model,
  Message,
  Context extends ReadonlyArray<unknown>,
  OutMessage,
  R,
  Evidence,
> = [Message] extends [never]
  ? (
      model: Model,
      message: Message,
      ...context: Context
    ) => DefinedUpdateReturn<Model, Message, OutMessage, R, Evidence>
  : {
      (
        message: Message,
      ): (
        model: Model,
        ...context: Context
      ) => DefinedUpdateReturn<Model, Message, OutMessage, R, Evidence>
      (
        model: Model,
        message: Message,
        ...context: Context
      ): DefinedUpdateReturn<Model, Message, OutMessage, R, Evidence>
    }

/** The exact operation returned by a Block's `step` authoring helper. */
export type DefinedStep<
  Model,
  Message,
  Context extends ReadonlyArray<unknown>,
  OutMessage,
  R,
  Evidence,
  DeferredKind,
  ResultEvidence = Evidence,
> = (
  model: Update.GraphInput<Model, Evidence>,
  ...context: Context
) => IsAny<DeferredKind> extends true
  ? Update.WithRegistrationEvidence<
      [OutMessage] extends [never]
        ? Update.Return<Model, Message, R>
        : Update.ReturnWithOutMessage<Model, Message, OutMessage, R>,
      ResultEvidence
    >
  : DeferredKind extends 'ResultRecipe'
    ? Update.ResultRecipe<Model, Message, OutMessage, R, ResultEvidence>
    : Update.WithRegistrationEvidence<
        [OutMessage] extends [never]
          ? Update.Return<Model, Message, R>
          : Update.ReturnWithOutMessage<Model, Message, OutMessage, R>,
        ResultEvidence
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

/** @internal Retains an owned document view in emitted declarations. */
export interface OwnedDocumentView<
  OwnerValue,
  Model,
  Message,
  RequiredViewRequirements,
> extends OwnedAuthoredView<
  DocumentView<Model, Message, RequiredViewRequirements>,
  OwnerValue,
  Model,
  Message,
  RequiredViewRequirements
> {}

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
          AuthoredViewInputs<ViewInputs>,
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
  ): OwnedDocumentView<OwnerValue, Model, Message, RequiredViewRequirements>
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
    view: ViewWithInputs<Model, Message, ViewInputs, RequiredViewRequirements>,
  ) => OwnedAuthoredView<
    BlockView<
      Model,
      Message,
      AuthoredViewInputs<ViewInputs>,
      RequiredViewRequirements
    >,
    OwnerValue,
    Model,
    Message,
    RequiredViewRequirements
  >
}

/**
 * Defines an internal Model transformation owned by a Block Definition.
 *
 * Use these Steps in update, init, and child OutMessage policies. A Step may
 * return an ordinary update result, another connected Step, or a passive child
 * initialization recipe. The helper preserves graph obligations until the
 * matching Composition interprets them under its registered graph.
 *
 * Public parent-driven operations belong in `prepareBlock({ operations })`. Each
 * exposed producer returns a local Message and its update context instead of a
 * Model transformation.
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
  ): NoInfer<
    DefinedStep<
      Model,
      DeferredStepMessage<Message, Output>,
      Context,
      OutMessageOfReturn<DeferredStepReturn<Output>>,
      CommandRequirements<DeferredStepReturn<Output>>,
      | Update.RegistrationEvidenceOf<DeferredStepReturn<Output>>
      | Update.GraphRequirementOf<Extract<Output, AnyFunction>>,
      DeferredStepKind<Output>,
      | Update.ResultEvidenceChannelOf<DeferredStepReturn<Output>>
      | Update.GraphRequirementOf<Extract<Output, AnyFunction>>
    >
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

type DeferredStepMessage<Message, Output> =
  CommandMessageOfReturn<DeferredStepReturn<Output>> extends infer ResultMessage
    ? [ResultMessage] extends [never]
      ? Message
      : ResultMessage
    : never

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
        ? [ResultMessage] extends [
            Message | GeneratedMessageOfRequirement<Evidence>,
          ]
          ? [ResultOutMessage] extends [OutMessage]
            ? unknown
            : never
          : never
        : never
    : never

type ValidateDeferredReturn<Model, Message, OutMessage, Value> =
  DeferredValueReturn<Value> extends infer Result
    ? Result extends Readonly<{ model: infer ResultModel }>
      ? true extends
          | IsAny<ResultModel>
          | IsUnknown<ResultModel>
          | IsAny<CommandMessageOfReturn<Result>>
          | IsUnknown<CommandMessageOfReturn<Result>>
          | IsAny<OutMessageOfReturn<Result>>
          | IsUnknown<OutMessageOfReturn<Result>>
        ? never
        : [ResultModel] extends [Model]
          ? [CommandMessageOfReturn<Result>] extends [
              | Message
              | GeneratedMessageOfRequirement<
                  Update.RegistrationEvidenceOf<Result>
                >,
            ]
            ? [OutMessageOfReturn<Result>] extends [OutMessage]
              ? Update.ValidateConcreteResultEvidence<Result>
              : never
            : never
          : never
      : never
    : never

type ValidateDeferredValue<Model, Message, OutMessage, Value> =
  Value extends Update.AnyResultRecipe
    ? ValidateResultRecipe<Model, Message, OutMessage, Value>
    : ValidateDeferredReturn<Model, Message, OutMessage, Value>

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
      ? ValidateDeferredReturn<Model, Message, OutMessage, Output>
      : Output extends Update.AnyResultRecipe
        ? ValidateResultRecipe<Model, Message, OutMessage, Output>
        : ValidateDeferredReturn<Model, Message, OutMessage, Output>

/** @internal Validates one inferred output through the Definition Step contract. */
export type ValidateDefinitionStepOutput<Model, Message, OutMessage, Output> =
  ValidateDeferredStepOutput<Model, Message, OutMessage, Output>

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

type OwnedSubscriptionEntries<Entries, Model, Message> = Readonly<{
  [Key in keyof Entries]: Entries[Key] &
    Subscription.Subscription<
      Model,
      Message,
      SubscriptionDependencies<Entries[Key]>,
      SubscriptionServices<Entries[Key]>
    >
}>

type SubscriptionEntryLayers<Entries> =
  Entries[keyof Entries] extends infer Entry
    ? Entry extends Readonly<{ layer: infer EntryLayer extends Layer.Any }>
      ? EntryLayer
      : never
    : never

type SubscriptionRegistryLayer<Entries> = Readonly<{
  layer: [keyof Entries] extends [never]
    ? Layer.Layer<never>
    : Layer.Layer<
        Layer.Success<SubscriptionEntryLayers<Entries>>,
        Layer.Error<SubscriptionEntryLayers<Entries>>,
        Layer.Services<SubscriptionEntryLayers<Entries>>
      >
}>

type MaybeSubscriptionRegistryLayer<Entries> = [keyof Entries] extends [never]
  ? SubscriptionRegistryLayer<Entries>
  : [Entries[keyof Entries]] extends [Readonly<{ layer: Layer.Any }>]
    ? SubscriptionRegistryLayer<Entries>
    : unknown

/** An owned Subscription registry with an aggregate Layer when every entry has an attached handler. */
export type OwnedSubscriptionRegistry<Entries, Model, Message> =
  OwnedSubscriptionEntries<Entries, Model, Message> &
    Subscription.Registry<OwnedSubscriptionEntries<Entries, Model, Message>> &
    MaybeSubscriptionRegistryLayer<Entries>

/** Defines Subscription registries against one Block's Model and Message. */
export interface DefineSubscriptions<Id extends string, Model, Message> {
  <
    Entries extends Readonly<
      Record<string, AnyLayeredSubscription<Model, Message>>
    >,
  >(
    build: (
      entry: OwnedSubscriptionEntryBuilder<Id, Model, Message>,
    ) => Entries &
      ('layer' extends keyof Entries ? Readonly<{ layer: never }> : unknown),
  ): OwnedSubscriptionRegistry<Entries, Model, Message>
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

/** An owned ManagedResource registry with an aggregate Layer when every entry has an attached handler. */
export type OwnedManagedResourceRegistry<Entries> =
  ManagedResource.OwnedRegistry<Entries>

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
    ) => Entries &
      ('layer' extends keyof Entries ? Readonly<{ layer: never }> : unknown) &
      ([Extract<keyof Entries, symbol>] extends [never]
        ? unknown
        : Readonly<{
            'ManagedResource registration keys must be strings': never
          }>),
  ): OwnedManagedResourceRegistry<Entries>
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

type BindingOutputs<Binding> =
  Binding extends Readonly<{
    fold: infer Fold extends AnyFunction
  }>
    ? Update.ResolvedOperationOutput<ReturnOf<Fold>>
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
  ValidateCompositionDelivery<ParentMessage, Children> &
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

type CompleteEffectsLayer<
  EffectsLayer extends AnyLayer,
  Children extends ReadonlyArray<AnyBinding>,
> = Layer.Layer<
  Layer.Success<EffectsLayer | AggregatedChildren<Children>['EffectsLayer']>,
  Layer.Error<EffectsLayer | AggregatedChildren<Children>['EffectsLayer']>,
  Layer.Services<EffectsLayer | AggregatedChildren<Children>['EffectsLayer']>
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

type ImplementationExposedOperations<Implementation> =
  Implementation extends Readonly<{ operations: infer ExposedOperations }>
    ? ExposedOperations
    : EmptyRecord

type ImplementationSubscriptions<Implementation> =
  Implementation extends Readonly<{ subscriptions: infer Subscriptions }>
    ? Subscription.RegistryEntries<Subscriptions>
    : EmptyRecord

type ImplementationManagedResources<Implementation> =
  Implementation extends Readonly<{ managedResources: infer ManagedResources }>
    ? ManagedResource.RegistryEntries<ManagedResources>
    : EmptyRecord

type ImplementationHostHandlers<Implementation> =
  Implementation extends Readonly<{ hostHandlers: infer HostHandlers }>
    ? HostHandlers
    : readonly []

/**
 * The channels supplied to a Block Composition's `prepareBlock` method. The
 * block retains the exact types of the supplied functions,
 * registrations, and local Layer recipe. Check an implementation with
 * `satisfies Implementation<Model, Message, OutMessage>` to retain its inferred
 * service requirements; annotating it with this broad type erases them.
 */
type ImplementationChannels<Model, Message, OutMessage, Operations> = Readonly<{
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
  /** Named parent-driven operations. Prefer local Message constructors for direct Message construction.
   * A constructor infers one constructor payload when fields exist, followed by
   * update's exact dispatch Context. Custom producers receive their declared
   * public arguments and return a nonempty `[Message, ...context]` tuple for
   * mapping, defaults, or refined inputs. Completion calls neither form. The
   * completed operation accepts the child Model first and synchronously passes
   * its Message through the completed update, preserving the full update
   * requirements and OutMessage contract. */
  operations?: Operations
  /** Subscription entries owned directly by this Block. */
  subscriptions?:
    | Subscription.Subscriptions<Model, Message, any>
    | (Subscription.Registry<Subscription.Subscriptions<Model, Message, any>> &
        Readonly<{ layer?: Layer.Any }>)
  /** ManagedResource entries owned directly by this Block. */
  managedResources?:
    | Readonly<
        Record<
          string,
          ManagedResource.Entry<Model, Message, any, any, any, any, any, any>
        >
      >
    | ManagedResource.Registry<
        Readonly<
          Record<
            string,
            ManagedResource.Entry<Model, Message, any, any, any, any, any, any>
          >
        >
      >
  /** The complete local handler recipe for this Block. Child Bindings contribute
   * their recipes automatically. Ordinary Service requirements remain for the
   * application root to provide. This field is explicit on the broad
   * `Implementation` contract. An inferred concrete `prepareBlock` argument may
   * omit it, in which case completion uses `Layer.empty`. */
  EffectsLayer: Layer.Layer<never, any, any> | Layer.Layer<any, any, any>
  /** Handler service contracts intentionally left for the host to provide before
   * the Block is bound into a runnable application. */
  hostHandlers?: ReadonlyArray<unknown>
}>

/**
 * The implementation channels accepted by a Block Composition. Use this type
 * with `satisfies` so `prepareBlock` can retain each channel's exact inferred
 * service requirements.
 */
export type Implementation<
  Model,
  Message,
  OutMessage = never,
> = ImplementationChannels<
  Model,
  Message,
  OutMessage,
  ExposedMessageOperations<Message>
>

type DefinitionImplementation<
  ModelSchema extends AnySchema,
  MessageSchema extends AnySchema,
  OutMessageSchema,
> = ImplementationChannels<
  ModelSchema['Type'],
  MessageSchema['Type'],
  OutMessageSchema extends AnySchema ? OutMessageSchema['Type'] : never,
  InferredExposedMessageOperations<MessageSchema['Type']>
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

type MessageFoldInput<
  Message,
  Context extends ReadonlyArray<unknown> = ReadonlyArray<unknown>,
> = readonly [message: Message, ...context: Context]

type UpdateFoldInput<UpdateFunction> = UpdateFunction extends AnyFunction
  ? Parameters<UpdateFunction> extends readonly [
      model: unknown,
      message: infer Message,
      ...context: infer Context,
    ]
    ? MessageFoldInput<Message, Context>
    : never
  : never

type ExposedUpdateInput<UpdateFunction, Message> =
  UpdateFoldInput<UpdateFunction> extends readonly [
    message: unknown,
    ...context: infer Context,
  ]
    ? MessageFoldInput<Message, Context>
    : never

type ValidateExposedOperation<Source, UpdateFunction, Message> =
  unknown extends Source
    ? never
    : Source extends AnyFunction &
          Readonly<{ '~type.make.in': unknown; Type: infer Output }>
      ? unknown extends Output
        ? never
        : Output extends Message
          ? unknown
          : never
      : Source extends AnyFunction
        ? unknown extends ReturnType<Source>
          ? never
          : ReturnType<Source> extends ExposedUpdateInput<
                UpdateFunction,
                Message
              >
            ? unknown
            : never
        : never

type ValidateExposedOperations<ImplementationValue, Message> =
  ImplementationValue extends Readonly<{
    update: infer UpdateFunction extends AnyFunction
    operations: infer ExposedOperations extends Readonly<
      Record<string, unknown>
    >
  }>
    ? IsAny<ExposedOperations> extends true
      ? Readonly<{ operations: never }>
      : Readonly<{
          operations: Readonly<{
            [Name in keyof ExposedOperations]: ValidateExposedOperation<
              ExposedOperations[Name],
              UpdateFunction,
              Message
            >
          }>
        }>
    : unknown

interface ExposedMessageOperations<Message> {
  readonly [name: string]: (
    ...args: ReadonlyArray<any>
  ) => MessageFoldInput<Message> | Message
}

interface InferredExposedMessageOperations<Message> {
  readonly [name: string]:
    | Readonly<{
        fields: Readonly<Record<string, unknown>>
        '~type.make.in': unknown
        Type: Readonly<{ _tag: string }>
      }>
    | ((...args: ReadonlyArray<any>) => MessageFoldInput<Message>)
}

type PublicProducerReturn<Output, Model, Message> = [
  OutMessageOfReturn<Output>,
] extends [never]
  ? PublicUpdate.Return<Model, Message, CommandRequirements<Output>>
  : PublicUpdate.ReturnWithOutMessage<
      Model,
      Message,
      OutMessageOfReturn<Output>,
      CommandRequirements<Output>
    >

type PublicExposedUpdateReturn<Output> = {
  [
    Key in keyof Output as Key extends typeof Update.RegistrationEvidenceTypeId
      ? never
      : Key
  ]: Key extends 'commands'
    ? [NonNullable<Output[Key]>] extends [never]
      ? Output[Key]
      :
          | PublicUpdate.Commands<
              CommandMessageOfReturn<Output>,
              CommandRequirements<Output>
            >
          | Extract<Output[Key], undefined>
    : Output[Key]
}

type PublicProducer<Producer, Model, Message> = Producer extends (
  ...args: infer Args
) => infer Output
  ? [Update.RegistrationEvidenceOf<Output>] extends [never]
    ? Producer
    : (...args: Args) => PublicProducerReturn<Output, Model, Message>
  : never

/** @internal Retains a completed update's two call signatures in emitted declarations. */
export interface CompletedUpdate<
  Model,
  Message,
  Context extends ReadonlyArray<unknown>,
  Output,
> {
  (message: Message): (model: Model, ...context: Context) => Output
  (model: Model, message: Message, ...context: Context): Output
}

type PublicUpdateProducer<Producer, Model, Message> =
  Producer extends AnyFunction
    ? [Update.RegistrationEvidenceOf<ReturnType<Producer>>] extends [never]
      ? Producer
      : Producer extends DefinedUpdate<any, any, any, any, any, any>
        ? Parameters<Producer> extends readonly [
            model: infer UpdateModel,
            message: infer UpdateMessage,
            ...context: infer Context,
          ]
          ? CompletedUpdate<
              UpdateModel,
              UpdateMessage,
              Context,
              PublicProducerReturn<ReturnType<Producer>, Model, Message>
            >
          : never
        : PublicProducer<Producer, Model, Message>
    : never

type ExposedProducerParameters<Producer> = Producer extends AnyFunction
  ? [Parameters<Producer>] extends [never]
    ? Producer extends (
        ...args: infer Args extends ReadonlyArray<unknown>
      ) => any
      ? Args
      : never
    : Parameters<Producer>
  : never

type ProjectedOperation<Args extends ReadonlyArray<unknown>, Output> = ((
  ...args: Args
) => PublicExposedUpdateReturn<Output>) &
  OperationEmission<
    IsAny<Output> extends true
      ? true
      : [Output] extends [never]
        ? true
        : unknown extends Output
          ? true
          : IsAny<OutMessageOfReturn<Output>> extends true
            ? true
            : [OutMessageOfReturn<Output>] extends [never]
              ? false
              : true
  >

type PublicExposedProducer<Producer, UpdateFunction, Model> =
  Producer extends Readonly<{
    fields: Readonly<Record<infer FieldName, unknown>>
    '~type.make.in': infer Input
    Type: infer Output extends Readonly<{ _tag: string }>
  }>
    ? UpdateFunction extends AnyFunction
      ? Parameters<UpdateFunction> extends readonly [
          unknown,
          unknown,
          ...infer Context,
        ]
        ? ProjectedOperation<
            readonly [
              model: Model,
              ...([FieldName] extends ['_tag']
                ? readonly []
                : readonly [
                    payload:
                      | Input
                      | (Omit<Output, '_tag'> &
                          Readonly<{ _tag?: Output['_tag'] }>),
                  ]),
              ...Context,
            ],
            OperationOutputOf<UpdateFunction, Output>
          >
        : never
      : never
    : Producer extends AnyFunction
      ? ReturnType<Producer> extends readonly [
          unknown,
          ...ReadonlyArray<unknown>,
        ]
        ? UpdateFunction extends AnyFunction
          ? ProjectedOperation<
              readonly [model: Model, ...ExposedProducerParameters<Producer>],
              OperationOutputOf<
                UpdateFunction,
                ReturnType<Producer> extends readonly [
                  infer Message,
                  ...ReadonlyArray<unknown>,
                ]
                  ? Message
                  : never
              >
            >
          : never
        : Producer
      : never

type PublicImplementationValue<Model, Message, ImplementationValue> = Readonly<{
  [Key in keyof ImplementationValue]: Key extends 'init'
    ? PublicProducer<ImplementationValue[Key], Model, Message>
    : Key extends 'update'
      ? PublicUpdateProducer<ImplementationValue[Key], Model, Message>
      : Key extends 'operations'
        ? Readonly<{
            [Step in keyof ImplementationValue[Key]]: PublicExposedProducer<
              ImplementationValue[Key][Step],
              ImplementationValue extends Readonly<{
                update: infer UpdateFunction
              }>
                ? UpdateFunction
                : never,
              Model
            >
          }>
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
  operations: ExposedOperations
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
> = Readonly<{
  __blockDefinitionView: Readonly<{
    owner: (value: OwnerValue) => OwnerValue
    model: (value: Model) => Model
    message: (value: Message) => Message
    mountRequirements: () => AllowedViewRequirements
  }>
}> &
  AnyAuthoredView

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
          'Block primary view must be authored with this Composition.makeView': ViewOwner
        }>
    : Readonly<{
        'Block primary view must be authored with this Composition.makeView': View
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
  Mounts extends ReadonlyArray<Mount.LayeredMountDefinition>,
  Children extends ReadonlyArray<AnyBinding>,
  ImplementationValue extends Readonly<{
    init: AnyFunction
    update: AnyFunction
    EffectsLayer: AnyLayer
  }>,
> = Readonly<{
  [LocalMountsTypeId]: Mounts
  bindings: Children
  init: ImplementationValue['init']
  update: ImplementationValue['update']
  subscriptions: ImplementationSubscriptions<ImplementationValue>
  managedResources: ImplementationManagedResources<ImplementationValue>
  EffectsLayer: CompleteEffectsLayer<
    ImplementationValue['EffectsLayer'],
    Children
  >
  hostHandlers: ImplementationHostHandlers<ImplementationValue>
}>

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

interface ReplaceEffectsLayer<
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
  <
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
  ): Block<
    OwnerValue,
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    Mounts,
    Children,
    SelectedEffectsImplementation<ImplementationValue, SelectedEffectsLayer>
  >
}

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
  readonly replaceEffectsLayer: ReplaceEffectsLayer<
    OwnerValue,
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    Mounts,
    Children,
    ImplementationValue
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
 * It normalizes optional local channels and carries the complete local and
 * descendant lifecycle registrations, Layer recipe, exposed operations, and
 * child Bindings needed to install the Block in a parent.
 */
interface BlockContractFields<
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
> {
  /** @internal Runtime identity bridge used while lowering child bindings. */
  readonly owner: OwnerValue
  /** Schema for this Block's Model. */
  readonly Model: ModelSchema
  /** Schema for facts handled by this Block's update function. */
  readonly Message: MessageSchema
  /** Local and descendant Mount definitions available when the Block is bound. */
  readonly mounts: readonly [
    ...Mounts,
    ...ReadonlyArray<InspectionOfBinding<Children[number]>['mounts'][number]>,
  ]
  /** @internal Retains the exact Mount definitions owned by this block. */
  readonly [LocalMountsTypeId]: Mounts
  /** Child Bindings registered in this Block's Composition. */
  readonly bindings: Children
  /** Creates the initial child Model and any Commands. A parent initializes a
   * connected occurrence through its registered Binding's init operation,
   * which constructs the parent Model and retains the lifted Commands. */
  readonly init: ImplementationValue['init']
  /** Produces the next child Model and any Commands or OutMessage for one child
   * Message. Parents invoke this through their Binding's `fold` method. */
  readonly update: ImplementationValue['update']
  /** Named parent-driven operations completed against this Block's update.
   * Each accepts the child Model first. Constructor-backed declarations then
   * accept a payload object when the Message has fields, followed by update's
   * dispatch Context; empty variants need no payload placeholder. Custom tuple
   * producers retain their own public arguments. Every operation synchronously
   * enters the completed update with its child graph active and retains the
   * selected handler's exact requirements and OutMessage contract. Binding
   * methods omit the child Model, prepend a key for keyed occurrences, and
   * return an opaque parent result for the registering Composition to consume. */
  readonly operations: ImplementationExposedOperations<ImplementationValue>
  /** Local and descendant Subscription registrations. A Runtime starts them for
   * active occurrences. */
  readonly subscriptions: ImplementationSubscriptions<ImplementationValue> &
    AggregatedChildren<Children>['subscriptions']
  /** Local and descendant ManagedResource registrations. A Runtime acquires
   * them for active occurrences. */
  readonly managedResources: ImplementationManagedResources<ImplementationValue> &
    AggregatedChildren<Children>['managedResources']
  /** Local and descendant handler recipes. Constructing the Block does not build
   * this Layer; the application Runtime builds the composed graph. */
  readonly EffectsLayer: CompleteEffectsLayer<
    ImplementationValue['EffectsLayer'],
    Children
  >
  /** @internal Retains the selected local Layer before child aggregation. */
  readonly [LocalEffectsLayerTypeId]: ImplementationValue['EffectsLayer']
  /** @internal Retains compact unresolved handler evidence for root completion. */
  readonly __blockHandlerRequirements: HandlerEvidence<
    ImplementationValue['EffectsLayer'],
    ImplementationHostHandlers<ImplementationValue>,
    Children
  >
  /** Handler contracts intentionally left for a host to provide before this
   * Block is bound into a runnable application. */
  readonly hostHandlers: ImplementationHostHandlers<ImplementationValue>
}

interface BlockContract<
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
>
  extends
    CompletionProof,
    BlockContractFields<
      OwnerValue,
      ModelSchema,
      MessageSchema,
      Mounts,
      Children,
      ImplementationValue
    >,
    BlockOperations<
      OwnerValue,
      ModelSchema,
      MessageSchema,
      OutMessageSchema,
      Mounts,
      Children,
      ImplementationValue
    > {}

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

type CompletedWithViewArguments<DefinitionValue, ImplementationValue> =
  DefinitionValue extends Readonly<{
    owner: infer OwnerValue extends Owner<string>
    Model: infer ModelSchema extends AnySchema
    Message: infer MessageSchema extends AnySchema
    [LocalMountsTypeId]: infer Mounts extends
      ReadonlyArray<Mount.LayeredMountDefinition>
    bindings: infer Children extends ReadonlyArray<AnyBinding>
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

type CompletedWithViewArgument<
  DefinitionValue,
  ImplementationValue,
  Key extends keyof CompletedWithViewArguments<
    DefinitionValue,
    ImplementationValue
  >,
> = CompletedWithViewArguments<DefinitionValue, ImplementationValue>[Key]

type OutMessageSchemaOf<DefinitionValue> =
  DefinitionValue extends Readonly<{
    OutMessage: infer OutMessageSchema extends AnySchema
  }>
    ? OutMessageSchema
    : never

/**
 * A completed Block derived from a Definition and implementation that both
 * publish an OutMessage Schema and a default view.
 */
export interface CompletedWithViewAndOutMessage<
  DefinitionValue,
  ImplementationValue,
> extends CompletedBlockWithViewAndOutMessage<
  CompletedWithViewArgument<DefinitionValue, ImplementationValue, 'OwnerValue'>,
  CompletedWithViewArgument<
    DefinitionValue,
    ImplementationValue,
    'ModelSchema'
  >,
  CompletedWithViewArgument<
    DefinitionValue,
    ImplementationValue,
    'MessageSchema'
  >,
  OutMessageSchemaOf<DefinitionValue>,
  CompletedWithViewArgument<DefinitionValue, ImplementationValue, 'Mounts'>,
  CompletedWithViewArgument<DefinitionValue, ImplementationValue, 'Children'>,
  CompletedWithViewArgument<
    DefinitionValue,
    ImplementationValue,
    'ImplementationValue'
  >
> {}

/**
 * A completed Block derived from a Definition and implementation that publish
 * a default view without an OutMessage Schema.
 */
export interface CompletedWithView<
  DefinitionValue,
  ImplementationValue,
> extends CompletedBlockWithView<
  CompletedWithViewArgument<DefinitionValue, ImplementationValue, 'OwnerValue'>,
  CompletedWithViewArgument<
    DefinitionValue,
    ImplementationValue,
    'ModelSchema'
  >,
  CompletedWithViewArgument<
    DefinitionValue,
    ImplementationValue,
    'MessageSchema'
  >,
  CompletedWithViewArgument<DefinitionValue, ImplementationValue, 'Mounts'>,
  CompletedWithViewArgument<DefinitionValue, ImplementationValue, 'Children'>,
  CompletedWithViewArgument<
    DefinitionValue,
    ImplementationValue,
    'ImplementationValue'
  >
> {}

/**
 * The passive contract produced after a Block definition is completed.
 * It carries the complete local and descendant lifecycle registrations, Layer
 * recipe, exposed operations, and child Bindings needed to install the Block in
 * a parent.
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
> =
  OutMessageSchema extends Schema.Codec<any, any, any, any>
    ? ImplementationValue extends Readonly<{ view: AnyAuthoredView }>
      ? CompletedBlockWithViewAndOutMessage<
          OwnerValue,
          ModelSchema,
          MessageSchema,
          OutMessageSchema,
          Mounts,
          Children,
          ImplementationValue
        >
      : CompletedBlockWithOutMessage<
          OwnerValue,
          ModelSchema,
          MessageSchema,
          OutMessageSchema,
          Mounts,
          Children,
          ImplementationValue
        >
    : ImplementationValue extends Readonly<{ view: AnyAuthoredView }>
      ? CompletedBlockWithView<
          OwnerValue,
          ModelSchema,
          MessageSchema,
          Mounts,
          Children,
          ImplementationValue
        >
      : CompletedBlockWithoutViewOrOutMessage<
          OwnerValue,
          ModelSchema,
          MessageSchema,
          Mounts,
          Children,
          ImplementationValue
        >

/**
 * The completed Block contract retained by a Composition's assembly draft.
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
    bindings: infer Children extends ReadonlyArray<AnyBinding>
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
    bindings: infer Children extends ReadonlyArray<AnyBinding>
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
 * Bound for any Block that has passed checked completion.
 */
export type AnyBlock = CompletionProof &
  Readonly<{
    owner: Owner<any>
    Model: AnySchema
    Message: AnySchema
    mounts: ReadonlyArray<Mount.LayeredMountDefinition>
    [LocalMountsTypeId]: ReadonlyArray<Mount.LayeredMountDefinition>
    bindings: ReadonlyArray<AnyBinding>
    init: AnyFunction
    update: AnyFunction
    operations: Readonly<Record<string, AnyFunction>>
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
  Readonly<{ operations: ExposedOperations }>

type PrepareBlockDefinition<OwnerValue extends Owner<string>> = Readonly<{
  owner: OwnerValue
}>

type PrepareBlockComposition<
  OwnerValue extends Owner<string>,
  ModelSchema extends AnySchema,
  MessageSchema extends AnySchema,
  OutMessageSchema extends AnySchema | undefined,
  Mounts extends ReadonlyArray<Mount.LayeredMountDefinition>,
  Children extends ReadonlyArray<AnyBinding>,
> = Readonly<{
  owner: OwnerValue
  Model: ModelSchema
  Message: MessageSchema
  [LocalMountsTypeId]: Mounts
  bindings: Children
}> &
  (OutMessageSchema extends AnySchema
    ? Readonly<{ OutMessage: OutMessageSchema }>
    : NoOutMessage)

type PrepareBlockCompositionForValidation<
  Mounts extends ReadonlyArray<Mount.LayeredMountDefinition>,
  Children extends ReadonlyArray<AnyBinding>,
  ImplementationValue,
> = ImplementationForValidation<
  Mounts,
  Children,
  CheckedImplementationValue<ImplementationValue>
>

type ValidatePrepareBlockComposition<
  OwnerValue extends Owner<string>,
  _ModelSchema extends AnySchema,
  _MessageSchema extends AnySchema,
  _OutMessageSchema extends AnySchema | undefined,
  Mounts extends ReadonlyArray<Mount.LayeredMountDefinition>,
  Children extends ReadonlyArray<AnyBinding>,
  ImplementationValue,
> = ValidateImplementationComposition<
  PrepareBlockDefinition<OwnerValue>,
  PrepareBlockCompositionForValidation<Mounts, Children, ImplementationValue>
> &
  ValidateBindingOperationNames<
    ImplementationExposedOperations<ImplementationValue>
  > &
  ('operations' extends keyof ImplementationValue
    ? ValidateExposedOperations<
        ImplementationValue,
        AuthoredMessage<_MessageSchema['Type'], Children>
      >
    : unknown)

type PublicPrepareBlockImplementation<
  ModelSchema extends AnySchema,
  MessageSchema extends AnySchema,
  ImplementationValue,
> = PublicImplementationValue<
  ModelSchema['Type'],
  MessageSchema['Type'],
  CheckedImplementationValue<ImplementationValue>
>

type ImplementationInput<
  ModelSchema extends AnySchema,
  MessageSchema extends AnySchema,
  OutMessageSchema,
> = Omit<
  DefinitionImplementation<ModelSchema, MessageSchema, OutMessageSchema>,
  'EffectsLayer'
> &
  Readonly<{ EffectsLayer?: AnyLayer }>

type ValidateImplementationLayerPresence<ImplementationValue> =
  'EffectsLayer' extends keyof ImplementationValue
    ? ImplementationValue extends Readonly<{ EffectsLayer: AnyLayer }>
      ? unknown
      : Readonly<{
          'An optional EffectsLayer cannot establish exact requirements': never
        }>
    : unknown

type ValidateImplementationView<
  OwnerValue extends Owner<string>,
  ModelSchema extends AnySchema,
  MessageSchema extends AnySchema,
  Mounts extends ReadonlyArray<Mount.LayeredMountDefinition>,
  Children extends ReadonlyArray<AnyBinding>,
  ImplementationValue extends object,
> =
  ImplementationValue extends Readonly<{
    view: DefinitionView<
      OwnerValue,
      ModelSchema,
      MessageSchema,
      Mounts,
      Children
    >
  }>
    ? ValidateDefinitionView<ImplementationValue['view']>
    : ValidateView<
        ImplementationValue,
        OwnerValue,
        ModelSchema['Type'],
        MessageSchema['Type'],
        DefinitionViewRequirements<Mounts, Children>
      >

type ImplementationRecipeValidation<
  OwnerValue extends Owner<string>,
  ModelSchema extends AnySchema,
  MessageSchema extends AnySchema,
  OutMessageSchema extends AnySchema | undefined,
  Mounts extends ReadonlyArray<Mount.LayeredMountDefinition>,
  Children extends ReadonlyArray<AnyBinding>,
  ImplementationValue extends object,
> = ImplementationInput<ModelSchema, MessageSchema, OutMessageSchema> &
  ExactImplementationKeys<ImplementationValue> &
  ValidateImplementationLayerPresence<ImplementationValue> &
  ValidateInit<ImplementationValue> &
  ValidateImplementationView<
    OwnerValue,
    ModelSchema,
    MessageSchema,
    Mounts,
    Children,
    ImplementationValue
  > &
  ValidatePrepareBlockComposition<
    OwnerValue,
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    Mounts,
    Children,
    CompletedImplementationValue<ImplementationValue>
  >

type ImplementationRecipeArguments<ImplementationValue, Validation> =
  string extends keyof ImplementationValue
    ? readonly [error: never]
    : [ImplementationValue] extends [never]
      ? readonly [error: never]
      : [ImplementationValue] extends [Validation]
        ? readonly []
        : readonly [error: never]

type ValidateHeadlessAssembly<
  OwnerValue extends Owner<string>,
  ModelSchema extends AnySchema,
  MessageSchema extends AnySchema,
  OutMessageSchema extends AnySchema | undefined,
  Mounts extends ReadonlyArray<Mount.LayeredMountDefinition>,
  Children extends ReadonlyArray<AnyBinding>,
  ImplementationValue extends object,
> = [ImplementationValue] extends [unknown]
  ? ValidatePrepareBlockComposition<
      OwnerValue,
      ModelSchema,
      MessageSchema,
      OutMessageSchema,
      Mounts,
      Children,
      ImplementationValue
    >
  : unknown

type ValidateDefaultEffectsAssembly<
  OwnerValue extends Owner<string>,
  ModelSchema extends AnySchema,
  MessageSchema extends AnySchema,
  OutMessageSchema extends AnySchema | undefined,
  Mounts extends ReadonlyArray<Mount.LayeredMountDefinition>,
  Children extends ReadonlyArray<AnyBinding>,
  ImplementationValue extends object,
> = [ImplementationValue] extends [unknown]
  ? ValidateInit<ImplementationValue> &
      ValidateView<
        ImplementationValue,
        OwnerValue,
        ModelSchema['Type'],
        MessageSchema['Type'],
        DefinitionViewRequirements<Mounts, Children>
      > &
      ValidatePrepareBlockComposition<
        OwnerValue,
        ModelSchema,
        MessageSchema,
        OutMessageSchema,
        Mounts,
        Children,
        DefaultEffectsImplementation<ImplementationValue>
      >
  : unknown

type ValidateInferredAssembly<
  OwnerValue extends Owner<string>,
  ModelSchema extends AnySchema,
  MessageSchema extends AnySchema,
  OutMessageSchema extends AnySchema | undefined,
  Mounts extends ReadonlyArray<Mount.LayeredMountDefinition>,
  Children extends ReadonlyArray<AnyBinding>,
  ImplementationValue extends object,
> = [ImplementationValue] extends [unknown]
  ? ValidateInit<ImplementationValue> &
      ValidateView<
        ImplementationValue,
        OwnerValue,
        ModelSchema['Type'],
        MessageSchema['Type'],
        DefinitionViewRequirements<Mounts, Children>
      > &
      ValidatePrepareBlockComposition<
        OwnerValue,
        ModelSchema,
        MessageSchema,
        OutMessageSchema,
        Mounts,
        Children,
        ImplementationValue
      >
  : unknown

type ValidateShapedAssembly<
  Init,
  OwnerValue extends Owner<string>,
  ModelSchema extends AnySchema,
  MessageSchema extends AnySchema,
  OutMessageSchema extends AnySchema | undefined,
  Mounts extends ReadonlyArray<Mount.LayeredMountDefinition>,
  Children extends ReadonlyArray<AnyBinding>,
  ImplementationValue,
> = [Init] extends [unknown]
  ? ValidatePrepareBlockComposition<
      OwnerValue,
      ModelSchema,
      MessageSchema,
      OutMessageSchema,
      Mounts,
      Children,
      ImplementationValue
    >
  : unknown

/** Prepares a Composition's implementation channels as an opaque, passive
 * draft. Assemble its private producer through a matching `FromAssembly`
 * annotation and `Block.assemble(prepare)` before using the Block.
 *
 * Call this method inside a private zero-argument `prepare` function. The
 * matching `FromAssembly` annotation names `typeof Model` and `typeof prepare`.
 * That explicit boundary lets a parent read the canonical `ChildBlock.Model`
 * Schema without inferring it through the child's complete implementation,
 * reducing TypeScript checking and editor work. See `Block.FromAssemblyWithView`
 * for the full pattern. It does not guarantee that every editor operation is fast.
 *
 * `init` and `update` are required. At an inferred concrete
 * call, an omitted `EffectsLayer` defaults to `Layer.empty`. Omitted local view,
 * exposed operations, lifecycle registrations, and host handlers become their
 * empty completed forms while registered children still contribute their
 * channels.
 *
 * Assembly does not build Layers, run init, call exposed producers, or start
 * lifecycle work. `EffectsLayer` contains the Block's local handler recipes;
 * child Bindings contribute their recipes automatically, and ordinary Service
 * requirements remain for the application root to provide. */
export interface PrepareBlock<
  OwnerValue extends Owner<string>,
  ModelSchema extends Schema.Codec<any, any, any, any>,
  MessageSchema extends Schema.Codec<any, any, any, any>,
  OutMessageSchema extends Schema.Codec<any, any, any, any> | undefined,
  Mounts extends ReadonlyArray<Mount.LayeredMountDefinition>,
  Children extends ReadonlyArray<AnyBinding>,
> {
  <
    const ImplementationValue extends ImplementationInput<
      ModelSchema,
      MessageSchema,
      OutMessageSchema
    >,
  >(
    implementation: ImplementationValue,
    ...validation: ImplementationRecipeArguments<
      NoInfer<ImplementationValue>,
      ImplementationRecipeValidation<
        OwnerValue,
        ModelSchema,
        MessageSchema,
        OutMessageSchema,
        Mounts,
        Children,
        NoInfer<ImplementationValue>
      >
    >
  ): AssemblyDraft<
    CompletedBlock<
      OwnerValue,
      ModelSchema,
      MessageSchema,
      OutMessageSchema,
      Mounts,
      Children,
      PublicPrepareBlockImplementation<
        ModelSchema,
        MessageSchema,
        CompletedImplementationValue<ImplementationValue>
      >
    >
  >
  <
    const ImplementationValue extends DefinitionImplementation<
      ModelSchema,
      MessageSchema,
      OutMessageSchema
    >,
  >(
    implementation: ImplementationValue &
      Readonly<{ view?: never }> &
      ExactImplementationKeys<ImplementationValue> &
      ValidateHeadlessAssembly<
        OwnerValue,
        ModelSchema,
        MessageSchema,
        OutMessageSchema,
        Mounts,
        Children,
        ImplementationValue
      >,
  ): AssemblyDraft<
    CompletedBlock<
      OwnerValue,
      ModelSchema,
      MessageSchema,
      OutMessageSchema,
      Mounts,
      Children,
      PublicPrepareBlockImplementation<
        ModelSchema,
        MessageSchema,
        ImplementationValue
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
      operations?: never
      hostHandlers?: never
      EffectsLayer: EffectsLayer &
        NoInfer<
          ValidatePrepareBlockComposition<
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
  ): AssemblyDraft<
    CompletedBlock<
      OwnerValue,
      ModelSchema,
      MessageSchema,
      OutMessageSchema,
      Mounts,
      Children,
      PublicPrepareBlockImplementation<
        ModelSchema,
        MessageSchema,
        ViewImplementation<Init, UpdateFunction, View, EffectsLayer>
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
      operations?: never
      hostHandlers?: never
      EffectsLayer: EffectsLayer &
        NoInfer<
          ValidatePrepareBlockComposition<
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
  ): AssemblyDraft<
    CompletedBlock<
      OwnerValue,
      ModelSchema,
      MessageSchema,
      OutMessageSchema,
      Mounts,
      Children,
      PublicPrepareBlockImplementation<
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
            ValidatePrepareBlockComposition<
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
  ): AssemblyDraft<
    CompletedBlock<
      OwnerValue,
      ModelSchema,
      MessageSchema,
      OutMessageSchema,
      Mounts,
      Children,
      PublicPrepareBlockImplementation<
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
  >
  <
    const CompositionValue extends PrepareBlockComposition<
      OwnerValue,
      ModelSchema,
      MessageSchema,
      undefined,
      Mounts,
      Children
    >,
    const ImplementationValue extends Readonly<{ view: AnyAuthoredView }>,
  >(
    this: CompositionValue,
    implementation: ImplementationValue &
      NoInfer<
        Omit<
          DefinitionImplementation<
            ModelSchema,
            MessageSchema,
            OutMessageSchema
          >,
          'EffectsLayer'
        > &
          Readonly<{ EffectsLayer?: never }>
      > &
      ExactImplementationKeys<ImplementationValue> &
      ValidateDefaultEffectsAssembly<
        OwnerValue,
        ModelSchema,
        MessageSchema,
        OutMessageSchema,
        Mounts,
        Children,
        ImplementationValue
      >,
  ): AssemblyDraft<
    CompletedWithView<
      CompositionValue,
      DefaultEffectsImplementation<ImplementationValue>
    >
  >
  <const ImplementationValue extends object>(
    implementation: ImplementationValue &
      NoInfer<
        Omit<
          DefinitionImplementation<
            ModelSchema,
            MessageSchema,
            OutMessageSchema
          >,
          'EffectsLayer'
        > &
          Readonly<{ EffectsLayer?: never }>
      > &
      ExactImplementationKeys<ImplementationValue> &
      ValidateDefaultEffectsAssembly<
        OwnerValue,
        ModelSchema,
        MessageSchema,
        OutMessageSchema,
        Mounts,
        Children,
        ImplementationValue
      >,
  ): AssemblyDraft<
    CompletedBlock<
      OwnerValue,
      ModelSchema,
      MessageSchema,
      OutMessageSchema,
      Mounts,
      Children,
      PublicPrepareBlockImplementation<
        ModelSchema,
        MessageSchema,
        DefaultEffectsImplementation<ImplementationValue>
      >
    >
  >
  <
    const ErasedImplementation extends Omit<
      DefinitionImplementation<ModelSchema, MessageSchema, OutMessageSchema>,
      'operations'
    >,
  >(
    implementation: ErasedImplementation &
      (Omit<
        Implementation<
          ModelSchema['Type'],
          MessageSchema['Type'],
          OutMessageSchema extends Schema.Codec<any, any, any, any>
            ? OutMessageSchema['Type']
            : never
        >,
        'operations'
      > extends ErasedImplementation
        ? unknown
        : never),
  ): AssemblyDraft<never>
  <const ImplementationValue extends object>(
    implementation: ImplementationValue &
      NoInfer<
        DefinitionImplementation<ModelSchema, MessageSchema, OutMessageSchema>
      > &
      ExactImplementationKeys<ImplementationValue> &
      ValidateInferredAssembly<
        OwnerValue,
        ModelSchema,
        MessageSchema,
        OutMessageSchema,
        Mounts,
        Children,
        ImplementationValue
      >,
  ): AssemblyDraft<
    CompletedBlock<
      OwnerValue,
      ModelSchema,
      MessageSchema,
      OutMessageSchema,
      Mounts,
      Children,
      PublicPrepareBlockImplementation<
        ModelSchema,
        MessageSchema,
        ImplementationValue
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
      operations: ExposedOperations
      EffectsLayer: EffectsLayer
    }> &
      NoInfer<
        ValidateShapedAssembly<
          Init,
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
      > &
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
  ): AssemblyDraft<
    CompletedBlock<
      OwnerValue,
      ModelSchema,
      MessageSchema,
      OutMessageSchema,
      Mounts,
      Children,
      PublicPrepareBlockImplementation<
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
          ValidatePrepareBlockComposition<
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
  ): AssemblyDraft<
    CompletedBlock<
      OwnerValue,
      ModelSchema,
      MessageSchema,
      OutMessageSchema,
      Mounts,
      Children,
      PublicPrepareBlockImplementation<
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
          ValidatePrepareBlockComposition<
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
  ): AssemblyDraft<
    CompletedBlock<
      OwnerValue,
      ModelSchema,
      MessageSchema,
      OutMessageSchema,
      Mounts,
      Children,
      PublicPrepareBlockImplementation<
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
      operations: ExposedOperations
      EffectsLayer: EffectsLayer
    }> &
      NoInfer<
        ValidateShapedAssembly<
          Init,
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
      > &
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
  ): AssemblyDraft<
    CompletedBlock<
      OwnerValue,
      ModelSchema,
      MessageSchema,
      OutMessageSchema,
      Mounts,
      Children,
      PublicPrepareBlockImplementation<
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
  >
  <const ImplementationValue extends object>(
    implementation: ImplementationValue &
      NoInfer<
        Omit<
          ImplementationInput<ModelSchema, MessageSchema, OutMessageSchema>,
          'view'
        > &
          Readonly<{ view?: AnyFunction }> &
          ExactImplementationKeys<ImplementationValue> &
          ValidateImplementationLayerPresence<ImplementationValue> &
          ValidateInferredAssembly<
            OwnerValue,
            ModelSchema,
            MessageSchema,
            OutMessageSchema,
            Mounts,
            Children,
            CompletedImplementationValue<ImplementationValue>
          >
      >,
    ...validation: ImplementationRecipeArguments<
      NoInfer<ImplementationValue>,
      unknown
    >
  ): AssemblyDraft<never>
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
    bindings: infer Children extends ReadonlyArray<AnyBinding>
  }>
    ? HtmlBuilder<Message, DefinitionViewRequirements<Mounts, Children>>
    : never

/** The passive typed authoring contract created by `Block.makeDefinition`. A Definition
 * owns local identities and Schemas; call `makeComposition` to register child and
 * Mount capabilities before completing the Block. */
export type Definition<
  OwnerValue extends Owner<string>,
  ModelSchema extends Schema.Codec<any, any, any, any>,
  MessageSchema extends Schema.Codec<any, any, any, any>,
  OutMessageSchema extends Schema.Codec<any, any, any, any> | undefined,
  Mounts extends ReadonlyArray<Mount.LayeredMountDefinition>,
  Children extends ReadonlyArray<AnyBinding>,
  ChildInitContextSchema extends AnySchema | undefined = undefined,
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
  bindings: Children
  /** Authors an internal Model transformation for update, init, or child
   * OutMessage policy composition. Declare parent-driven operations as local
   * Message producers under `prepareBlock({ operations })`. */
  makeStep: DefineStep<
    ModelSchema['Type'],
    MessageSchema['Type'],
    OutMessageSchema extends Schema.Codec<any, any, any, any>
      ? OutMessageSchema['Type']
      : never
  >
  /** Builds an exhaustive child OutMessage fold against this Definition's
   * Model, Message, and optional OutMessage contracts. */
  makeOutMessageFold: MakeOutMessageFold<
    ModelSchema['Type'],
    MessageSchema['Type'],
    OutMessageSchema extends Schema.Codec<any, any, any, any>
      ? OutMessageSchema['Type']
      : never
  >
  /** Authors a Model-only Step from a deferred field-transformation callback. */
  makeFieldsStep: DefineStepFields<ModelSchema['Type'], MessageSchema['Type']>
  /** Creates a Step preserving the incoming Model, with no Commands or OutMessage. */
  makeNoopStep: DefineStepNoop<ModelSchema['Type']>
  /** Creates a Model-preserving Step whose deferred callback produces Commands.
   * Runtime executes the returned Commands. */
  makeCommandsStep: MakeCommandsStep<ModelSchema['Type'], MessageSchema['Type']>
  /** Defines Subscription entries owned directly by this Block. */
  makeSubscriptions: DefineSubscriptions<
    OwnerValue['id'],
    ModelSchema['Type'],
    MessageSchema['Type']
  >
  /** Defines ManagedResource entries owned directly by this Block. */
  makeManagedResources: DefineManagedResources<
    OwnerValue['id'],
    ModelSchema['Type'],
    MessageSchema['Type']
  >
  /** Creates child Bindings fixed to this Definition's parent Model, Message,
   * and OutMessage contracts. */
  makeBinding: BindChild<
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    ChildInitContextSchema extends AnySchema
      ? ChildInitContextSchema['Type']
      : never
  >
  /** Registers the child and Mount graph and returns the Composition used to
   * author its view and complete its Block. */
  makeComposition: MakeComposition<
    OwnerValue,
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    ChildInitContextSchema
  >
}> &
  (ChildInitContextSchema extends AnySchema
    ? Readonly<{
        /** Schema for the context parent init prepares for its child Binding init policies. */
        ChildInitContext: ChildInitContextSchema
      }>
    : unknown) &
  (OutMessageSchema extends Schema.Codec<any, any, any, any>
    ? Readonly<{
        OutMessage: OutMessageSchema
        /** Builds an exhaustive child OutMessage mapper into this Definition's
         * declared parent OutMessage contract. */
        makeOutMessageForward: MakeOutMessageForward<OutMessageSchema['Type']>
        /** Creates a Step preserving the incoming Model and emitting the
         * deferred callback's declared OutMessage, with no Commands. */
        makeOutMessageStep: MakeOutMessageStep<
          ModelSchema['Type'],
          MessageSchema['Type'],
          OutMessageSchema['Type']
        >
      }>
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
  | 'OutMessage'
  | 'mounts'
  | typeof LocalMountsTypeId
  | 'bindings'
> & {
  /** Complete dispatch Codec, including this Composition's generated child Messages. */
  readonly Message: DispatchSchemaFor<MessageSchema, Children>
  /** Authors initialization for this registered graph. The callback supplies
   * parent-owned fields and may prepare one shared ChildInitContext for its
   * child Binding init policies. Child initialization and listed Steps produce the
   * complete Model and lifted Commands when the returned initializer is called.
   * Policy obligations retained by raw Binding operations resolve against this
   * Composition's complete registered graph. */
  readonly makeInit: CompositionInit<
    ModelSchema['Type'],
    MessageSchema['Type'],
    Children,
    DispatchSchemaFor<MessageSchema, Children>['Type']
  >
  /** Authors parent transitions while registered child delivery policies route
   * their wrapper Messages through the native Binding folds. Raw Binding
   * operations retain direct child channels plus an opaque policy obligation;
   * this completed update resolves the policy's transitive requirements,
   * OutMessages, and registration evidence against the full graph. The
   * exhaustive handler record gives each handler its exact local Message variant
   * and retains that handler's visible result contract. */
  readonly makeUpdate: DefineCompositionUpdate<
    ModelSchema['Type'],
    MessageSchema['Type'],
    OutMessageSchema extends AnySchema ? OutMessageSchema['Type'] : never,
    Children,
    false,
    DispatchSchemaFor<MessageSchema, Children>['Type']
  >
  /** Authors a view against this Composition's Model, Message, local Mounts,
   * and registered child Bindings. */
  readonly makeView: DefineView<
    OwnerValue,
    ModelSchema['Type'],
    DispatchSchemaFor<MessageSchema, Children>['Type'],
    DefinitionViewRequirements<Mounts, Children>
  >
  /** Prepares an opaque, passive draft inside a private zero-argument `prepare`
   * function. Assemble it with a matching `FromAssembly` annotation and
   * `Block.assemble(prepare)`. The explicit Model Schema and producer establish
   * a TypeScript performance boundary for parent Model Schema construction.
   * See `Block.FromAssemblyWithView` for the full pattern and its limits. */
  readonly prepareBlock: PrepareBlock<
    OwnerValue,
    ModelSchema,
    DispatchSchemaFor<MessageSchema, Children>,
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
  ChildInitContextSchema extends AnySchema | undefined = undefined,
> {
  (
    ...validation: CompositionDeliveryArguments<
      MessageSchema['Type'],
      readonly []
    >
  ): Composition<
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
       * bindings default to an empty tuple. */
      bindings?: Children
    }> &
      ValidateChildInitContext<
        Children,
        ChildInitContextSchema extends AnySchema
          ? ChildInitContextSchema['Type']
          : never
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
  ChildInitContextSchema extends AnySchema | undefined = undefined,
> = Definition<
  OwnerValue,
  ModelSchema,
  MessageSchema,
  OutMessageSchema,
  readonly [],
  readonly [],
  ChildInitContextSchema
>

/** Establishes Model, Message, and optional OutMessage contracts for Block
 * authoring. */
export interface DefineBlock<OwnerValue extends Owner<string>> {
  <
    const ModelSchema extends AnySchema,
    const MessageSchema extends AnySchema,
    const OutMessageSchema extends AnySchema,
    const ChildInitContextSchema extends AnySchema | undefined = undefined,
  >(
    config: Readonly<{
      /** Schema for the Block's Model. */
      Model: ModelSchema
      /** Schema for facts the Block's update function handles. */
      Message: MessageSchema
      /** Schema for facts the Block can report to a parent. */
      OutMessage: OutMessageSchema
      /** Shared input Schema for Binding init selectors; this value is not stored in the Model. */
      ChildInitContext?: ChildInitContextSchema
      mounts?: never
      bindings?: never
    }>,
  ): Base<
    OwnerValue,
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    ChildInitContextSchema
  >
  <
    const ModelSchema extends AnySchema,
    const MessageSchema extends AnySchema,
    const ChildInitContextSchema extends AnySchema | undefined = undefined,
  >(
    config: Readonly<{
      /** Schema for the Block's Model. */
      Model: ModelSchema
      /** Schema for facts the Block's update function handles. */
      Message: MessageSchema
      /** Shared input Schema for Binding init selectors; this value is not stored in the Model. */
      ChildInitContext?: ChildInitContextSchema
      OutMessage?: never
      mounts?: never
      bindings?: never
    }>,
  ): Base<
    OwnerValue,
    ModelSchema,
    MessageSchema,
    undefined,
    ChildInitContextSchema
  >
}

const makeDefineView = <
  OwnerValue extends Owner<any>,
  Model,
  Message,
  RequiredViewRequirements,
>(
  owner: OwnerValue,
  mounts: ReadonlyArray<Mount.LayeredMountDefinition>,
  bindings: ReadonlyArray<AnyBinding>,
): DefineView<OwnerValue, Model, Message, RequiredViewRequirements> => {
  function defineView(
    view: (
      model: Model,
      h: HtmlBuilder<Message, RequiredViewRequirements>,
    ) => Document,
  ): OwnedDocumentView<OwnerValue, Model, Message, RequiredViewRequirements>
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
    | OwnedDocumentView<OwnerValue, Model, Message, RequiredViewRequirements> {
    const ownedView = withViewIdentity(owner, mounts, bindings, view)
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const authoredView = defineHtmlView(ownedView as any) as
      | OwnedAuthoredView<
          BlockView<Model, Message, void, RequiredViewRequirements>,
          OwnerValue,
          Model,
          Message,
          RequiredViewRequirements
        >
      | OwnedDocumentView<OwnerValue, Model, Message, RequiredViewRequirements>

    registerViewInputs(authoredView, false)
    return authoredView
  }

  const withInputs = <ViewInputs = never>(
    view: ViewWithInputs<Model, Message, ViewInputs, RequiredViewRequirements>,
  ): OwnedAuthoredView<
    BlockView<
      Model,
      Message,
      AuthoredViewInputs<ViewInputs>,
      RequiredViewRequirements
    >,
    OwnerValue,
    Model,
    Message,
    RequiredViewRequirements
  > => {
    const ownedView = withViewIdentity(owner, mounts, bindings, view)
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const authoredView = defineHtmlView(ownedView as any) as OwnedAuthoredView<
      BlockView<
        Model,
        Message,
        AuthoredViewInputs<ViewInputs>,
        RequiredViewRequirements
      >,
      OwnerValue,
      Model,
      Message,
      RequiredViewRequirements
    >

    registerViewInputs(authoredView, true)
    return authoredView
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
  ): NoInfer<
    DefinedStep<
      Model,
      DeferredStepMessage<Message, Output>,
      Context,
      OutMessageOfReturn<DeferredStepReturn<Output>>,
      CommandRequirements<DeferredStepReturn<Output>>,
      | Update.RegistrationEvidenceOf<DeferredStepReturn<Output>>
      | Update.GraphRequirementOf<Extract<Output, AnyFunction>>,
      DeferredStepKind<Output>,
      | Update.ResultEvidenceChannelOf<DeferredStepReturn<Output>>
      | Update.GraphRequirementOf<Extract<Output, AnyFunction>>
    >
  >
  function defineStep(step: AnyFunction): AnyFunction {
    return (model: unknown, ...context: ReadonlyArray<unknown>) => {
      const output = step(model, ...context)
      const deferred = Predicate.isFunction(output) ? output(model) : output
      if (!isBindingInitRecipe(deferred)) {
        return deferred
      }

      if (isRegisteredBindingInitRecipe(deferred)) {
        return runBindingInitRecipe(deferred)
      }

      return makeResultRecipe(() => runBindingInitRecipe(deferred))
    }
  }

  return defineStep
}

const isSubscriptionEntryRecord = (
  value: unknown,
): value is Readonly<globalThis.Record<PropertyKey, unknown>> =>
  Predicate.isObject(value) && !globalThis.Array.isArray(value)

const makeDefineSubscriptions = <Id extends string, Model, Message>(
  owner: Owner<Id>,
): DefineSubscriptions<Id, Model, Message> =>
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  ((build: AnyFunction) => {
    const builtSubscriptions: unknown = Subscription.make<Model, Message>()(
      entry => {
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
      },
    )

    if (!isSubscriptionEntryRecord(builtSubscriptions)) {
      throw new Error(
        '[foldkit] Definition.makeSubscriptions callback must return a Subscription entry record.',
      )
    }

    if (Object.hasOwn(builtSubscriptions, 'layer')) {
      throw new Error(
        '[foldkit] Definition.makeSubscriptions reserves "layer" for its aggregate handler Layer.',
      )
    }

    const subscriptions = { ...builtSubscriptions }
    Object.defineProperty(subscriptions, Subscription.RegistryEntriesTypeId, {
      value: subscriptions,
    })

    const maybeLayers = Array.map(
      Object.entries(subscriptions),
      ([key, entry]) => {
        if (!Predicate.isObject(entry) || !Object.hasOwn(entry, 'layer')) {
          return Option.none()
        }

        const layer = Reflect.get(entry, 'layer')
        const isLayer: boolean = Layer.isLayer(layer)

        if (!isLayer) {
          throw new Error(
            `[foldkit] Definition.makeSubscriptions entry "${key}" has a "layer" value that is not an Effect Layer.`,
          )
        }

        return Option.some<unknown>(layer)
      },
    )

    if (Array.every(maybeLayers, Option.isSome)) {
      const layers = Array.getSomes(maybeLayers)
      const layer = Array.match(layers, {
        onEmpty: () => Layer.empty,
        onNonEmpty: implementedEntries =>
          Reflect.apply(Layer.mergeAll, undefined, implementedEntries),
      })
      Object.defineProperty(subscriptions, 'layer', { value: layer })
    }

    return subscriptions
  }) as never

const makeDefineManagedResources = <Id extends string, Model, Message>(
  owner: Owner<Id>,
): DefineManagedResources<Id, Model, Message> =>
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  ((build: AnyFunction) => {
    const builtManagedResources: unknown = ManagedResource.make<
      Model,
      Message
    >()(entry => {
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

      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      return build(ownedEntry) as never
    })

    if (!isSubscriptionEntryRecord(builtManagedResources)) {
      throw new Error(
        '[foldkit] Definition.makeManagedResources callback must return a ManagedResource entry record.',
      )
    }

    const prototype = Object.getPrototypeOf(builtManagedResources)
    if (prototype !== null && prototype !== Object.prototype) {
      throw new Error(
        '[foldkit] Definition.makeManagedResources expects a record with own resource entries, not inherited entries.',
      )
    }

    const entries: Record<string, unknown> = {}
    const managedResources: Record<string, unknown> = {}
    const entryKeys = Array.map(Reflect.ownKeys(builtManagedResources), key => {
      if (!Predicate.isString(key)) {
        throw new Error(
          '[foldkit] Definition.makeManagedResources registration keys must be own string properties.',
        )
      }

      if (key === 'layer') {
        throw new Error(
          '[foldkit] Definition.makeManagedResources reserves "layer" for its aggregate handler Layer.',
        )
      }

      const entryProperty = {
        configurable: true,
        enumerable: true,
        value: Reflect.get(builtManagedResources, key),
        writable: true,
      }
      Object.defineProperty(entries, key, entryProperty)
      Object.defineProperty(managedResources, key, entryProperty)
      return key
    })

    Object.freeze(entries)

    Object.defineProperty(
      managedResources,
      ManagedResource.RegistryEntriesTypeId,
      {
        value: entries,
      },
    )

    const maybeLayers = Array.map(entryKeys, key => {
      const entry = Reflect.get(entries, key)
      if (
        !Predicate.isObject(entry) ||
        identityOf(entry)?.kind !== 'ManagedResource'
      ) {
        throw new Error(
          `[foldkit] Definition.makeManagedResources entry "${key}" is not a ManagedResource entry.`,
        )
      }

      if (!Object.hasOwn(entry, 'layer')) {
        return Option.none()
      }

      const layer = Reflect.get(entry, 'layer')
      const isLayer: boolean = Layer.isLayer(layer)

      if (!isLayer) {
        throw new Error(
          `[foldkit] Definition.makeManagedResources entry "${key}" has a "layer" value that is not an Effect Layer.`,
        )
      }

      return Option.some<unknown>(layer)
    })

    if (Array.every(maybeLayers, Option.isSome)) {
      const layers = Array.getSomes(maybeLayers)
      const layer = Array.match(layers, {
        onEmpty: () => Layer.empty,
        onNonEmpty: implementedEntries =>
          Reflect.apply(Layer.mergeAll, undefined, implementedEntries),
      })
      Object.defineProperty(managedResources, 'layer', { value: layer })
    }

    Object.freeze(managedResources)
    return managedResources
  }) as never

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
    ChildInitContext?: AnySchema
    mounts?: ReadonlyArray<Mount.LayeredMountDefinition>
    bindings?: ReadonlyArray<AnyBinding>
  }>,
  authoring?: Readonly<{
    makeStep: AnyFunction
    makeFieldsStep: AnyFunction
    makeNoopStep: AnyFunction
    makeCommandsStep: AnyFunction
    makeSubscriptions: AnyFunction
    makeManagedResources: AnyFunction
  }>,
): any => {
  const localMounts = Object.freeze(globalThis.Array.from(config.mounts ?? []))
  const publicBindings = Object.freeze(
    globalThis.Array.from(config.bindings ?? []),
  )
  const normalized = normalizeCompositionGraph({ bindings: publicBindings })
  const bindings = Object.freeze(normalized.bindings)

  const parentContract = {
    ownerToken: owner.token,
    Model: config.Model,
    Message: config.Message,
    OutMessage: config.OutMessage,
    ChildInitContext: config.ChildInitContext,
  }

  assertBindingParentContracts(parentContract, owner.id, bindings)
  registerOperationGraphOutMessagePolicies(bindings, normalized.policies)

  const childChannels = aggregateChildren(bindings)
  const mounts = mergeMounts(localMounts, childChannels.mounts)
  const dispatchMessage = makeDispatchSchema(
    config.Message,
    generatedEnvelopeSchemas(bindings),
  )

  const assertOperationMessage = makeOperationMessageValidator(config.Message)
  const defineView = makeDefineView(owner, localMounts, bindings)
  const init = makeInit(config.Model, bindings)
  const update = makeCompositionUpdate(
    dispatchMessage,
    bindings,
    authoring !== undefined,
  )
  const defineStep = authoring?.makeStep ?? makeDefineStep()
  const defineOutMessageFold = makeOutMessageFold()
  const defineOutMessageForward = makeOutMessageForward()
  const stepFields = authoring?.makeFieldsStep ?? makeStepFields()
  const stepNoop = authoring?.makeNoopStep ?? makeStepNoop
  const commandsStep = authoring?.makeCommandsStep ?? makeCommandsStep()
  const defineSubscriptions =
    authoring?.makeSubscriptions ?? makeDefineSubscriptions(owner)
  const defineManagedResources =
    authoring?.makeManagedResources ?? makeDefineManagedResources(owner)
  const bindChild = makeBindChild<
    typeof config.Model,
    typeof config.Message,
    typeof config.OutMessage
  >(parentContract)
  type OperationSource = AnyFunction
  const emptyOperations: Readonly<Record<string, OperationSource>> = {}
  const completedOperationsBySource = new WeakMap<
    Readonly<Record<string, OperationSource>>,
    WeakMap<AnyFunction, Readonly<Record<string, AnyFunction>>>
  >()
  const completeOperations = (
    source: Readonly<Record<string, OperationSource>>,
    update: AnyFunction,
  ): Readonly<Record<string, AnyFunction>> => {
    const existing = completedOperationsBySource.get(source)?.get(update)
    if (existing !== undefined) {
      return existing
    }

    const isChildMessage: (value: unknown) => boolean = Reflect.apply(
      Schema.is,
      undefined,
      [config.Message],
    )
    const completed = Record.map(source, (operation, name) => {
      if (isOperationMessageConstructor(operation)) {
        assertOperationMessage(operation)
        assertLocalOperationMessage(operation, bindings)
      } else if (!Predicate.isFunction(operation)) {
        throw new Error(
          `[foldkit] Block "${owner.id}" operation "${name}" must be a local Message constructor or a Message tuple producer.`,
        )
      }

      const produce = isOperationMessageConstructor(operation)
        ? prepareOperation(operation)
        : operation

      return (model: unknown, ...args: ReadonlyArray<any>) =>
        withOperationGraph(bindings, () => {
          const input = produce(...args)
          if (!globalThis.Array.isArray(input) || Array.isArrayEmpty(input)) {
            throw new Error(
              `[foldkit] Block "${owner.id}" exposed operation "${name}" must return a nonempty [Message, ...context] tuple.`,
            )
          }
          const [message] = input
          if (!isChildMessage(message)) {
            throw new Error(
              `[foldkit] Block "${owner.id}" exposed operation "${name}" returned a Message outside this Block's Message Schema.`,
            )
          }
          assertLocalOperationTag(Reflect.get(message, '_tag'), bindings)
          const output = update(model, ...input)
          const resolved = resolveOperationOutput(output, model)
          return isBindingInitRecipe(resolved)
            ? runBindingInitRecipe(resolved)
            : resolved
        })
    })
    const completedByUpdate =
      completedOperationsBySource.get(source) ?? new WeakMap()
    completedByUpdate.set(update, completed)
    completedOperationsBySource.set(source, completedByUpdate)

    return completed
  }

  function prepareBlock(
    implementation: {
      readonly view?: AnyAuthoredView
      readonly init: AnyFunction
      readonly update: AnyFunction
      readonly operations?: Readonly<Record<string, OperationSource>>
      readonly subscriptions?: AnySubscriptionInput
      readonly managedResources?: AnyManagedResourceInput
      readonly EffectsLayer?: AnyLayer
      readonly hostHandlers?: ReadonlyArray<unknown>
    },
    retainedHostIdentities?: ReadonlyArray<DefinitionIdentity>,
    areHostHandlersProvided = false,
  ): Omit<AnyBlock, keyof CompletionProof> {
    if (Reflect.has(implementation, 'expose')) {
      throw new Error(
        `[foldkit] Block "${owner.id}" declares the removed "expose" field. Use "operations" for public operations.`,
      )
    }

    const operationsSource = implementation.operations ?? emptyOperations
    assertValidBindingOperationNames(operationsSource)
    const completedUpdate = update.complete(implementation.update)
    const operations = completeOperations(operationsSource, completedUpdate)
    const subscriptions = Subscription.aggregate(
      implementation.subscriptions ?? {},
      childChannels.subscriptions,
    )
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const managedResources = ManagedResource.aggregate(
      implementation.managedResources ?? {},
      childChannels.managedResources,
    ) as AnyManagedResources
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
      descendantOwners: descendantOwnersOf(bindings),
      ...(areHostHandlersProvided
        ? {
            requiredIdentities: new Set(
              hostIdentities.map(identity => identity.token),
            ),
          }
        : {}),
    })
    const EffectsLayer = Array.isReadonlyArrayEmpty(bindings)
      ? selectedLayer
      : Layer.merge(selectedLayer, childChannels.EffectsLayer)
    const hostHandlers = implementation.hostHandlers ?? []

    assertDistinctManagedResourceOwners(managedResources)

    function replaceEffectsLayer(EffectsLayer: AnyLayer): AnyBlock {
      assertCompletedBlock(block)

      return completeDerivedBlock(
        prepareBlock(
          { ...implementation, EffectsLayer },
          hostIdentities,
          areHostHandlersProvided,
        ),
      )
    }

    function provideHandlers(HandlersLayer: AnyLayer): AnyBlock {
      assertCompletedBlock(block)

      return completeDerivedBlock(
        prepareBlock(
          {
            ...implementation,
            EffectsLayer: Layer.merge(localEffectsLayer, HandlersLayer),
            hostHandlers: [],
          },
          hostIdentities,
          true,
        ),
      )
    }

    const block = {
      owner,
      Model: config.Model,
      Message: dispatchMessage,
      ...(config.OutMessage === undefined
        ? {}
        : { OutMessage: config.OutMessage }),
      makeView: defineView,
      mounts,
      [LocalMountsTypeId]: localMounts,
      bindings: publicBindings,
      init: implementation.init,
      update: completedUpdate,
      operations,
      subscriptions,
      managedResources,
      EffectsLayer,
      hostHandlers,
      [LocalEffectsLayerTypeId]: localEffectsLayer,
      replaceEffectsLayer,
      provideHandlers,
    }

    registerRuntimeBindings(block, bindings)
    registerDefaultView(block, implementation.view)
    localChannels.set(block, {
      subscriptions: Subscription.aggregate(implementation.subscriptions ?? {}),
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      managedResources: ManagedResource.aggregate(
        implementation.managedResources ?? {},
      ) as AnyManagedResources,
    })
    registerBlockHostIdentities(block, hostIdentities)

    return block
  }

  return {
    owner,
    Model: config.Model,
    Message: dispatchMessage,
    ...(config.ChildInitContext === undefined
      ? {}
      : { ChildInitContext: config.ChildInitContext }),
    ...(config.OutMessage === undefined
      ? {}
      : {
          OutMessage: config.OutMessage,
          makeOutMessageForward: defineOutMessageForward,
          makeOutMessageStep: makeOutMessageStep(),
        }),
    mounts,
    [LocalMountsTypeId]: localMounts,
    bindings: publicBindings,
    makeView: defineView,
    makeInit: init,
    makeUpdate: update,
    makeStep: defineStep,
    makeOutMessageFold: defineOutMessageFold,
    makeFieldsStep: stepFields,
    makeNoopStep: stepNoop,
    makeCommandsStep: commandsStep,
    makeSubscriptions: defineSubscriptions,
    makeManagedResources: defineManagedResources,
    makeBinding: bindChild,
    prepareBlock,
  }
}
type RuntimeCompositionGraph = Readonly<{
  mounts?: ReadonlyArray<Mount.LayeredMountDefinition>
  bindings?: ReadonlyArray<AnyBinding>
}>

const assertCompositionGraph: (
  value: unknown,
) => asserts value is RuntimeCompositionGraph = value => {
  if (!Predicate.isObject(value) || globalThis.Array.isArray(value)) {
    throw new Error(
      '[foldkit] Definition.makeComposition configuration must be an object.',
    )
  }

  for (const field of Object.getOwnPropertyNames(value)) {
    if (field !== 'mounts' && field !== 'bindings') {
      throw new Error(
        `[foldkit] Definition.makeComposition does not support the configuration field "${field}".`,
      )
    }
  }

  const mounts = Reflect.get(value, 'mounts')
  if (mounts !== undefined && !globalThis.Array.isArray(mounts)) {
    throw new Error(
      '[foldkit] Definition.makeComposition configuration field "mounts" must be an array when present.',
    )
  }

  const bindings = Reflect.get(value, 'bindings')
  if (bindings !== undefined && !globalThis.Array.isArray(bindings)) {
    throw new Error(
      '[foldkit] Definition.makeComposition configuration field "bindings" must be an array when present.',
    )
  }
}

const normalizeCompositionGraph = (graph: RuntimeCompositionGraph) => {
  const bindings: Array<AnyBinding> = []
  const policies: Array<readonly [object, RuntimeOutMessagePolicy]> = []

  for (const entry of graph.bindings ?? []) {
    if (!Predicate.isObject(entry)) {
      throw new Error(
        '[foldkit] Composition bindings must be child Binding values.',
      )
    }
    const selection = selectedBindingOutMessagePolicyOf(entry)
    if (selection === undefined) {
      if (bindingRequiresOutMessagePolicy(entry)) {
        throw new Error(
          `[foldkit] Child Binding "${entry.placement}" requires withOutMessagePolicy before Composition registration.`,
        )
      }
      bindings.push(entry)
    } else {
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      bindings.push(selection.binding as AnyBinding)
      policies.push([selection.binding, selection.outMessage])
    }
  }

  return { bindings, policies }
}

/** @internal Creates a typed definition before its composition graph. */
export const makeBaseDefinition = (
  owner: Owner<any>,
  config: Readonly<{
    Model: AnySchema
    Message: AnySchema
    OutMessage?: AnySchema
    ChildInitContext?: AnySchema
  }>,
): any => {
  const base = makeDefinition(owner, config)

  const makeComposition = (graph: RuntimeCompositionGraph = {}) => {
    assertCompositionGraph(graph)
    const composition = makeDefinition(owner, { ...config, ...graph }, base)
    const publicComposition = {
      owner: composition.owner,
      Model: composition.Model,
      Message: composition.Message,
      ...(composition.OutMessage === undefined
        ? {}
        : { OutMessage: composition.OutMessage }),
      mounts: composition.mounts,
      [LocalMountsTypeId]: composition[LocalMountsTypeId],
      bindings: composition.bindings,
      makeInit: composition.makeInit,
      makeUpdate: composition.makeUpdate,
      makeView: composition.makeView,
      prepareBlock: (implementation: unknown) =>
        makeAssemblyDraft(composition.prepareBlock(implementation)),
    }

    compositions.add(publicComposition)
    return publicComposition
  }

  return {
    owner: base.owner,
    Model: base.Model,
    Message: base.Message,
    ...(base.ChildInitContext === undefined
      ? {}
      : { ChildInitContext: base.ChildInitContext }),
    ...(base.OutMessage === undefined
      ? {}
      : {
          OutMessage: base.OutMessage,
          makeOutMessageForward: base.makeOutMessageForward,
          makeOutMessageStep: base.makeOutMessageStep,
        }),
    mounts: base.mounts,
    [LocalMountsTypeId]: base[LocalMountsTypeId],
    bindings: base.bindings,
    makeStep: base.makeStep,
    makeOutMessageFold: base.makeOutMessageFold,
    makeFieldsStep: base.makeFieldsStep,
    makeNoopStep: base.makeNoopStep,
    makeCommandsStep: base.makeCommandsStep,
    makeSubscriptions: base.makeSubscriptions,
    makeManagedResources: base.makeManagedResources,
    makeBinding: base.makeBinding,
    makeComposition,
  }
}
// oxlint-enable effecttsgo/any-unknown-in-error-context
