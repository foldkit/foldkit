import { Option, Predicate, Schema, SchemaAST } from 'effect'

import type * as Update from '../update/index.js'
import { resolveOperationOutput } from '../update/operationRecipe.js'
import type {
  AnyBinding,
  GeneratedMessageOfRequirement,
  RequirementsOfBindings,
} from './binding.js'
import type { GeneratedEnvelopeOf } from './childEnvelope.js'
import type {
  HasInvalidCombinedStepsRegistration,
  ResolveCompositionOutput,
} from './deferredPolicy.js'
import type { DefinedUpdate, DefinedUpdateSource } from './definition.js'
import {
  type AnyBindingInitRecipe,
  type BindingInitRecipe,
  type BindingInitRecipeReturn,
  isBindingInitRecipe,
  runBindingInitRecipe,
} from './initRecipe.js'
import { runtimeMessageSchemaContract } from './messageSchemaContract.js'
import { withOperationGraph } from './operationGraph.js'
import type { OperationOutputs } from './operationOutputs.js'

export type { OperationOutputs } from './operationOutputs.js'

type AnyFunction = (...args: ReadonlyArray<any>) => any

type IsAny<Value> = 0 extends 1 & Value ? true : false

type IsUnknown<Value> =
  IsAny<Value> extends true ? false : unknown extends Value ? true : false

type IsUnion<Value, Whole = Value> = Value extends unknown
  ? [Whole] extends [Value]
    ? false
    : true
  : never

type AnyUpdateReturn = Readonly<{
  model: any
  commands?: ReadonlyArray<any> | undefined
  outMessage?: any
}>

/** @internal Carries exact incoming and outgoing Message evidence for delivery. */
declare const BindingDeliveryTypeId: unique symbol

/** @internal Exact delivery evidence retained by a Binding. */
export interface BindingDeliveryEvidence<
  OutgoingMessage,
  IncomingMessage,
  GeneratedSchema extends Schema.Top = never,
> {
  readonly [BindingDeliveryTypeId]: Readonly<{
    outgoingMessage: OutgoingMessage
    incomingMessage: IncomingMessage
    generatedSchema: GeneratedSchema
  }>
}

/** @internal Recovers the exact parent Message produced by a Binding mapper. */
export type OutgoingMessageOfBinding<BindingValue> =
  BindingValue extends BindingDeliveryEvidence<infer OutgoingMessage, any, any>
    ? OutgoingMessage
    : never

/** @internal Recovers the exact parent Message variant claimed by a Binding. */
export type IncomingMessageOfBinding<BindingValue> =
  BindingValue extends BindingDeliveryEvidence<any, infer IncomingMessage, any>
    ? IncomingMessage
    : never

/** @internal Removes exact delivery evidence before another Binding form replaces it. */
export type WithoutBindingDeliveryEvidence<BindingValue> = Omit<
  BindingValue,
  typeof BindingDeliveryTypeId
>

type ParentMessageConstructor = Schema.Top &
  ((...args: ReadonlyArray<any>) => Readonly<{ _tag: string }>)

type FoldArguments<Fold extends AnyFunction> =
  Parameters<Fold> extends readonly [unknown, ...infer Arguments]
    ? Readonly<Arguments>
    : never

/**
 * Maps one exact parent Message variant into the arguments after `model` in a
 * Binding's native `fold`. `None` leaves the parent Model unchanged.
 */
export type FromParentMessageArgs<
  ParentModel,
  Constructor extends ParentMessageConstructor,
  Fold extends AnyFunction,
> = (
  model: ParentModel,
  message: ReturnType<Constructor>,
) => Option.Option<FoldArguments<Fold>>

/**
 * Declares an explicit parent Message route into a Binding's native `fold`.
 * A canonical unkeyed wrapper may omit `parentMessage` and reuse its existing
 * `parentMessage` constructor.
 */
export type FromParentMessagePolicy<
  ParentModel,
  Constructor extends ParentMessageConstructor,
  Fold extends AnyFunction,
  MayReuseParentMessage extends boolean = false,
> = [MayReuseParentMessage] extends [true]
  ? Readonly<{
      parentMessage?: Constructor
      args: FromParentMessageArgs<ParentModel, Constructor, Fold>
    }>
  : Readonly<{
      parentMessage: Constructor
      args: FromParentMessageArgs<ParentModel, Constructor, Fold>
    }>

type IncomingPolicy<
  ParentModel,
  ParentMessage,
  Arguments extends ReadonlyArray<unknown>,
> =
  ParentMessage extends Readonly<{ _tag: string }>
    ? Readonly<{
        /** Names the exact parent wrapper handled by this Binding. */
        parentMessage: Schema.Top &
          ((...args: ReadonlyArray<any>) => ParentMessage)
        /** Returns native fold arguments, or None to ignore this delivery. */
        args: (
          model: ParentModel,
          message: ParentMessage,
        ) => Option.Option<Arguments>
      }>
    : never

type ChildUpdateContext<BlockValue> =
  BlockValue extends Readonly<{
    update: (model: any, message: any, ...context: infer Context) => any
  }>
    ? Context
    : readonly []

/** @internal Complete Message policy shared by explicit standalone Binding configs. */
export type BindingMessagePolicy<
  BlockValue extends Readonly<{ Message: Readonly<{ Type: unknown }> }>,
  ParentModel,
  ParentMessage,
  Prefix extends ReadonlyArray<unknown> = readonly [],
> = BlockValue extends { Message: { Type: never } }
  ? Readonly<{ toParentMessage?: never; fromParentMessage?: never }>
  : Readonly<{
      /** Wraps child output for view dispatches, Commands and lifecycle channels. */
      toParentMessage: (
        ...args: readonly [...Prefix, message: BlockValue['Message']['Type']]
      ) => ParentMessage
      /** Selects one wrapper and its exact child fold arguments. */
      fromParentMessage: IncomingPolicy<
        ParentModel,
        ParentMessage,
        readonly [
          ...Prefix,
          message: BlockValue['Message']['Type'],
          ...ChildUpdateContext<BlockValue>,
        ]
      >
    }>

type MessageTag<Message> =
  Message extends Readonly<{
    _tag: infer Tag extends string
  }>
    ? Tag
    : never

type RequiredNeverKeys<Value> = {
  [Key in keyof Value]-?: object extends Pick<Value, Key>
    ? never
    : [Value[Key]] extends [never]
      ? Key
      : never
}[keyof Value]

type GotWrapperMessage<Message> =
  IsAny<Message> extends true
    ? never
    : Message extends Readonly<{
          _tag: infer Tag extends string
        }>
      ? IsAny<Tag> extends true
        ? never
        : string extends Tag
          ? never
          : Tag extends `Got${infer Name}`
            ? Name extends ''
              ? never
              : [RequiredNeverKeys<Message>] extends [never]
                ? Message
                : never
            : never
      : never

type GotWrapperMessageTag<Message> = MessageTag<GotWrapperMessage<Message>>

type IncomingMessageTag<BindingValue> = MessageTag<
  IncomingMessageOfBinding<BindingValue>
>

type OutgoingMessageTag<BindingValue> =
  MessageTag<OutgoingMessageOfBinding<BindingValue>> extends infer Tag extends
    string
    ? IsAny<Tag> extends true
      ? never
      : string extends Tag
        ? never
        : true extends IsUnion<Tag>
          ? never
          : Tag
    : never

type IncomingBindingIndexes<Bindings extends ReadonlyArray<unknown>> = {
  [
    Index in keyof Bindings as Index extends `${number}`
      ? IncomingMessageTag<Bindings[Index]>
      : never
  ]: Index
}

type OutgoingBindingIndexes<Bindings extends ReadonlyArray<unknown>> = {
  [
    Index in keyof Bindings as Index extends `${number}`
      ? OutgoingMessageTag<Bindings[Index]>
      : never
  ]: Index
}

type ConflictingDeliveryTags<
  IncomingIndexes,
  OutgoingIndexes,
  OutgoingTags extends keyof OutgoingIndexes = keyof OutgoingIndexes,
> = {
  [Tag in keyof IncomingIndexes]: true extends IsUnion<
    | IncomingIndexes[Tag]
    | (Tag extends OutgoingTags ? OutgoingIndexes[Tag] : never)
  >
    ? Tag
    : never
}[keyof IncomingIndexes]

type DeliveryConflicts<Bindings extends ReadonlyArray<unknown>> =
  ConflictingDeliveryTags<
    IncomingBindingIndexes<Bindings>,
    OutgoingBindingIndexes<Bindings>
  > extends infer Conflict
    ? [Conflict] extends [never]
      ? never
      : Readonly<{
          'Parent Message variants routed to a child must have one owning Binding': Conflict
        }>
    : never

type MissingDeliveryTags<Message, Bindings extends ReadonlyArray<unknown>> =
  GotWrapperMessageTag<Message> extends infer Required
    ? IsUnknown<Required> extends true
      ? never
      : Exclude<
            Required,
            IncomingMessageTag<Bindings[number]>
          > extends infer Missing
        ? [Missing] extends [never]
          ? never
          : Readonly<{
              'Every Got* child wrapper must have one owning Binding': Missing
            }>
        : never
    : never

type CompositionDeliveryErrors<
  Message,
  Bindings extends ReadonlyArray<unknown>,
> =
  | DeliveryConflicts<Bindings>
  | MissingDeliveryTags<Message, Bindings>
  | (Extract<
      MessageTag<Message>,
      MessageTag<GeneratedEnvelopeOf<Bindings[number]>['Type']>
    > extends infer Conflict
      ? [Conflict] extends [never]
        ? never
        : Readonly<{
            'Local facts and generated child Messages must have distinct tags': Conflict
          }>
      : never)

/** Rejects missing or conflicting child wrapper ownership in a Composition. */
export type ValidateCompositionDelivery<
  Message,
  Bindings extends ReadonlyArray<unknown>,
> = [CompositionDeliveryErrors<Message, Bindings>] extends [never]
  ? unknown
  : CompositionDeliveryErrors<Message, Bindings>

/** @internal Requires an error argument when a Composition graph is invalid. */
export type CompositionDeliveryArguments<
  Message,
  Bindings extends ReadonlyArray<unknown>,
> =
  unknown extends ValidateCompositionDelivery<Message, Bindings>
    ? readonly []
    : readonly [error: ValidateCompositionDelivery<Message, Bindings>]

/** @internal Selects local facts that authored operations may send through update. */
export type AuthoredMessage<Message, Bindings extends ReadonlyArray<unknown>> =
  Message extends Readonly<{ _tag: infer Tag }>
    ? [GotWrapperMessage<Message>] extends [never]
      ? Tag extends IncomingMessageTag<Bindings[number]>
        ? never
        : Message
      : never
    : Message

type BindingFold<BindingValue> =
  BindingValue extends Readonly<{
    fold: infer Fold extends AnyFunction
  }>
    ? Fold
    : never

type RoutedBinding<BindingValue> = BindingValue extends unknown
  ? [IncomingMessageOfBinding<BindingValue>] extends [never]
    ? never
    : BindingValue
  : never

type RouteFold<Bindings extends ReadonlyArray<unknown>> = BindingFold<
  RoutedBinding<Bindings[number]>
>

type ReturnOutMessage<Output> = Output extends unknown
  ? 'outMessage' extends keyof Output
    ? Output extends Readonly<{ outMessage?: infer OutMessage }>
      ? Exclude<OutMessage, undefined>
      : never
    : never
  : never

type HasAnyContext<Context extends ReadonlyArray<unknown>> =
  Context extends readonly []
    ? false
    : Context extends readonly [infer Head, ...infer Tail]
      ? 0 extends 1 & Head
        ? true
        : HasAnyContext<Tail>
      : 0 extends 1 & Context[number]
        ? true
        : false

type ValidateAnnotatedContext<Context extends ReadonlyArray<unknown>> =
  HasAnyContext<Context> extends true
    ? Readonly<{
        'Block context parameters cannot use any': Context
      }>
    : unknown

type ContextualUpdateCasesFactory<
  Context extends ReadonlyArray<unknown>,
  Cases,
> = {
  bivarianceHack(...context: Context): Cases
}['bivarianceHack']

type OwnedReturn<Model, Message, OutMessage> = Readonly<{
  model: Model
  commands?: Update.Commands<Message, any> | undefined
  outMessage?: OutMessage
}>

type ResolvedAuthoredOutput<
  Output,
  Bindings extends ReadonlyArray<AnyBinding>,
> = ResolveCompositionOutput<
  Output extends AnyBindingInitRecipe
    ? BindingInitRecipeReturn<Output>
    : Output,
  Bindings
>

type AuthoredRecipeOutput<Output> = Output extends AnyBindingInitRecipe
  ? BindingInitRecipeReturn<Output>
  : Output

type ValidateAuthoredEvidence<Output> = Update.ValidateConcreteResultEvidence<
  AuthoredRecipeOutput<Output>
>

type HasErasedAuthoredChannels<Output> = Output extends
  | Update.AnyResultRecipe
  | AnyBindingInitRecipe
  ? false
  : AuthoredRecipeOutput<Output> extends Readonly<{
        model: infer ResultModel
      }>
    ? true extends
        | IsAny<ResultModel>
        | ('commands' extends keyof AuthoredRecipeOutput<Output>
            ? AuthoredRecipeOutput<Output> extends Readonly<{
                commands?: infer Commands
              }>
              ? IsAny<Exclude<Commands, undefined>>
              : false
            : false)
        | ('outMessage' extends keyof AuthoredRecipeOutput<Output>
            ? AuthoredRecipeOutput<Output> extends Readonly<{
                outMessage?: infer ResultOutMessage
              }>
              ? IsAny<Exclude<ResultOutMessage, undefined>>
              : false
            : false)
      ? true
      : false
    : false

type ValidateNoErasedAuthoredChannels<Output> =
  true extends HasErasedAuthoredChannels<Output>
    ? Readonly<{
        'Composition result channels cannot use any': true
      }>
    : unknown

type HasInvalidAuthoredRecipeChannels<Model, Message, OutMessage, Output> =
  Output extends Update.ResultRecipe<
    infer ResultModel,
    infer ResultMessage,
    infer ResultOutMessage,
    any,
    any
  >
    ? true extends
        | IsAny<ResultModel>
        | IsAny<ResultMessage>
        | IsAny<ResultOutMessage>
      ? true
      : [ResultModel, Model] extends [Model, ResultModel]
        ? [ResultMessage] extends [
            | Message
            | GeneratedMessageOfRequirement<
                Update.RegistrationEvidenceOf<Output>
              >,
          ]
          ? [ResultOutMessage] extends [OutMessage]
            ? false
            : true
          : true
        : true
    : Output extends BindingInitRecipe<
          infer ResultModel,
          infer ResultMessage,
          any,
          any
        >
      ? true extends IsAny<ResultModel> | IsAny<ResultMessage>
        ? true
        : [ResultModel] extends [Model]
          ? [ResultMessage] extends [
              | Message
              | GeneratedMessageOfRequirement<
                  Update.RegistrationEvidenceOf<Output>
                >,
            ]
            ? false
            : true
          : true
      : false

type ValidateAuthoredRecipeChannels<Model, Message, OutMessage, Output> = [
  HasInvalidAuthoredRecipeChannels<Model, Message, OutMessage, Output>,
] extends [false]
  ? unknown
  : Readonly<{
      'Composition result channels must match the Definition': true
    }>

type HasInvalidMixedRawChannels<Model, Message, OutMessage, Output> =
  Output extends Update.AnyResultRecipe | AnyBindingInitRecipe
    ? false
    : Output extends OwnedReturn<Model, Message, OutMessage>
      ? false
      : true

type ValidateMixedRawChannels<Model, Message, OutMessage, Output> = [
  Extract<Output, Update.AnyResultRecipe | AnyBindingInitRecipe>,
] extends [never]
  ? unknown
  : true extends HasInvalidMixedRawChannels<Model, Message, OutMessage, Output>
    ? Readonly<{
        'Composition result channels must match the Definition': true
      }>
    : unknown

type RouteRequirements<Bindings extends ReadonlyArray<AnyBinding>> =
  RouteFold<Bindings> extends infer Fold extends AnyFunction
    ? Update.RequirementsOfResult<
        ResolveCompositionOutput<ReturnType<Fold>, Bindings>
      >
    : never

type RouteOutMessage<Bindings extends ReadonlyArray<AnyBinding>> =
  ReturnOutMessage<
    ResolveCompositionOutput<ReturnType<RouteFold<Bindings>>, Bindings>
  >

type RouteRegistration<Bindings extends ReadonlyArray<AnyBinding>> =
  Update.RegistrationEvidenceOf<
    ResolveCompositionOutput<ReturnType<RouteFold<Bindings>>, Bindings>
  >

type AuthoredRequirements<Output> = Update.RequirementsOfResult<Output>

type AuthoredRegistration<Output> = Update.RegistrationEvidenceOf<Output>

type CompositionDefinedUpdateReturn<
  Model,
  Message,
  Output,
  Bindings extends ReadonlyArray<AnyBinding>,
> = Update.WithRegistrationEvidence<
  [
    | ReturnOutMessage<ResolvedAuthoredOutput<Output, Bindings>>
    | RouteOutMessage<Bindings>,
  ] extends [never]
    ? Update.Return<
        Model,
        Message,
        | AuthoredRequirements<ResolvedAuthoredOutput<Output, Bindings>>
        | RouteRequirements<Bindings>
      >
    : Update.ReturnWithOutMessage<
        Model,
        Message,
        | ReturnOutMessage<ResolvedAuthoredOutput<Output, Bindings>>
        | RouteOutMessage<Bindings>,
        | AuthoredRequirements<ResolvedAuthoredOutput<Output, Bindings>>
        | RouteRequirements<Bindings>
      >,
  | AuthoredRegistration<ResolvedAuthoredOutput<Output, Bindings>>
  | RouteRegistration<Bindings>
>

type CompositionDefinedUpdateValue<
  Model,
  Message,
  Context extends ReadonlyArray<unknown>,
  Output,
  Bindings extends ReadonlyArray<AnyBinding>,
> = DefinedUpdate<
  Model,
  Message,
  Context,
  | ReturnOutMessage<ResolvedAuthoredOutput<Output, Bindings>>
  | RouteOutMessage<Bindings>,
  | AuthoredRequirements<ResolvedAuthoredOutput<Output, Bindings>>
  | RouteRequirements<Bindings>,
  | AuthoredRegistration<ResolvedAuthoredOutput<Output, Bindings>>
  | RouteRegistration<Bindings>
>

type CompositionDefinedUpdate<
  Model,
  Message,
  Context extends ReadonlyArray<unknown>,
  Output,
  Bindings extends ReadonlyArray<AnyBinding>,
  PreserveSource extends boolean,
> = CompositionDefinedUpdateValue<Model, Message, Context, Output, Bindings> &
  ([PreserveSource] extends [true]
    ? DefinedUpdateSource<
        readonly [
          Model,
          Message,
          Context,
          CompositionDefinedUpdateReturn<Model, Message, Output, Bindings>,
        ]
      >
    : unknown)

type RoutedOnlyUpdate<
  Model,
  Message,
  Bindings extends ReadonlyArray<AnyBinding>,
  PreserveSource extends boolean,
> = CompositionDefinedUpdate<
  Model,
  Message,
  readonly [],
  Readonly<{ model: Model }>,
  Bindings,
  PreserveSource
>

type AuthoredOutputForm<Output> =
  Output extends Readonly<{ model: unknown }>
    ? 'commands' | 'outMessage' extends keyof Output
      ? 'Canonical'
      : 'Raw'
    : 'Connected'

type ValidateAuthoredUpdate<
  Model,
  Message,
  OutMessage,
  Output,
  Bindings extends ReadonlyArray<AnyBinding>,
> = ValidateNoErasedAuthoredChannels<Output> &
  ValidateAuthoredRecipeChannels<Model, Message, OutMessage, Output> &
  ValidateMixedRawChannels<Model, Message, OutMessage, Output> &
  ValidateAuthoredEvidence<Output> &
  ('Connected' | 'Raw' extends AuthoredOutputForm<Output>
    ? Readonly<{
        'Local results beside connected operations must use Definition-owned Steps to preserve Commands and OutMessages': never
      }>
    : HasInvalidCombinedStepsRegistration<
          Update.RegistrationEvidenceOf<
            ResolvedAuthoredOutput<Output, Bindings>
          >
        > extends true
      ? Readonly<{
          'Update.combineSteps cannot discard an OutMessage produced by a registered child Binding policy; return that bound operation directly': never
        }>
      : unknown)

type AuthoredMessageArguments<Message> = [Message] extends [never]
  ? readonly []
  : [Message] extends [Readonly<{ _tag: infer Tag extends string }>]
    ? Readonly<Record<never, never>> extends Readonly<Record<Tag, unknown>>
      ? readonly [
          error: Readonly<{
            'Composition.makeUpdate requires local Messages with finite literal _tag values': never
          }>,
        ]
      : readonly []
    : readonly [
        error: Readonly<{
          'Composition.makeUpdate requires local Messages with finite literal _tag values': never
        }>,
      ]

type AuthoredMessageTag<Message> =
  Message extends Readonly<{
    _tag: infer Tag extends string
  }>
    ? Tag
    : never

type AuthoredUpdateHandler<
  Model,
  Message,
  Bindings extends ReadonlyArray<AnyBinding>,
  Tag,
  Output,
> = (
  model: Update.CompositionInput<Model, RequirementsOfBindings<Bindings>>,
  message: Extract<AuthoredMessage<Message, Bindings>, Readonly<{ _tag: Tag }>>,
) => Output

type AuthoredUpdateResult<Model, Message, OutMessage, Output> = Output extends
  | AnyBindingInitRecipe
  | Update.AnyResultRecipe
  ? unknown
  : OwnedReturn<Model, Message, OutMessage>

type AuthoredUpdateCases<
  Model,
  Message,
  Bindings extends ReadonlyArray<AnyBinding>,
  Outputs,
  DispatchMessage,
  OutMessage,
> = {
  readonly [Tag in keyof Outputs]: AuthoredUpdateHandler<
    Model,
    Message,
    Bindings,
    Tag,
    Outputs[Tag]
  >
} & {
  readonly [Tag in keyof NoInfer<Outputs>]: IsAny<Outputs[Tag]> extends true
    ? Readonly<{ 'Block update handlers cannot return any': never }>
    : [Outputs[Tag]] extends [never]
      ? Readonly<{ 'Block update handlers cannot return never': never }>
      : AuthoredUpdateHandler<
          Model,
          Message,
          Bindings,
          Tag,
          NoInfer<Outputs>[Tag] &
            AuthoredUpdateResult<
              Model,
              DispatchMessage,
              OutMessage,
              NoInfer<Outputs>[Tag]
            > &
            ValidateAuthoredUpdate<
              Model,
              DispatchMessage,
              OutMessage,
              NoInfer<Outputs>[Tag],
              Bindings
            >
        >
}

type OutputChannels<Tag, Output> = readonly [
  tag: Tag,
  outMessage: ReturnOutMessage<Output>,
  requirements: AuthoredRequirements<Output>,
  registration: AuthoredRegistration<Output>,
]

type CaseOutputChannels<Bindings extends ReadonlyArray<AnyBinding>, Outputs> = [
  Bindings[number],
] extends [never]
  ? {
      readonly [Tag in keyof Outputs]: OutputChannels<
        Tag,
        Update.ResolvedOperationOutput<AuthoredRecipeOutput<Outputs[Tag]>>
      >
    }[keyof Outputs]
  : {
      readonly [Tag in keyof Outputs]: OutputChannels<
        Tag,
        ResolvedAuthoredOutput<Outputs[Tag], Bindings>
      >
    }[keyof Outputs]

type ValidDefineCompositionUpdate<
  Model,
  Message,
  OutMessage,
  Bindings extends ReadonlyArray<AnyBinding>,
  PreserveSource extends boolean,
  DispatchMessage,
> = [AuthoredMessage<Message, Bindings>] extends [never]
  ? (
      cases: Readonly<Record<string, never>>,
    ) => RoutedOnlyUpdate<Model, DispatchMessage, Bindings, PreserveSource>
  : {
      <
        const Outputs extends Readonly<
          Record<
            AuthoredMessageTag<AuthoredMessage<Message, Bindings>>,
            unknown
          >
        >,
      >(
        cases: AuthoredUpdateCases<
          Model,
          Message,
          Bindings,
          Outputs,
          DispatchMessage,
          OutMessage
        > &
          Readonly<
            Record<
              Exclude<
                keyof Outputs,
                AuthoredMessageTag<AuthoredMessage<Message, Bindings>>
              >,
              never
            >
          >,
        ...invalidMessageContract: AuthoredMessageArguments<
          AuthoredMessage<Message, Bindings>
        >
      ): CompositionDefinedUpdate<
        Model,
        DispatchMessage,
        readonly [],
        Outputs[keyof Outputs],
        Bindings,
        PreserveSource
      > &
        OperationOutputs<CaseOutputChannels<Bindings, Outputs>>
      /** Authors exhaustive local Message handlers that also depend on
       *  per-dispatch context. `createCases` stays unevaluated during
       *  configuration. The completed update invokes it for an authored local
       *  dispatch, then calls the selected handler with the contextual Model
       *  and exact local Message variant. The visible return contract retains
       *  the union of the handlers' result channels. */
      readonly withContext: <
        const Context extends ReadonlyArray<unknown>,
        const Outputs extends Readonly<
          Record<
            AuthoredMessageTag<AuthoredMessage<Message, Bindings>>,
            unknown
          >
        >,
      >(
        createCases: ContextualUpdateCasesFactory<
          Context,
          AuthoredUpdateCases<
            Model,
            Message,
            Bindings,
            Outputs,
            DispatchMessage,
            OutMessage
          > &
            Readonly<
              Record<
                Exclude<
                  keyof Outputs,
                  AuthoredMessageTag<AuthoredMessage<Message, Bindings>>
                >,
                never
              >
            >
        > &
          ValidateAnnotatedContext<NoInfer<Context>>,
        ...invalidMessageContract: AuthoredMessageArguments<
          AuthoredMessage<Message, Bindings>
        >
      ) => CompositionDefinedUpdate<
        Model,
        DispatchMessage,
        Context,
        Outputs[keyof Outputs],
        Bindings,
        PreserveSource
      > &
        OperationOutputs<CaseOutputChannels<Bindings, Outputs>>
    }

/**
 * Authors a Composition update after child Bindings claim their incoming
 * parent Message variants. The returned update accepts the complete parent
 * Message union.
 *
 * Pass an exhaustive handler record. Each handler receives the contextual
 * Model and its exact local Message variant, and retains its visible result
 * contract. The selected handler runs only when the completed update receives
 * an authored local Message.
 */
export type DefineCompositionUpdate<
  Model,
  Message,
  OutMessage,
  Bindings extends ReadonlyArray<AnyBinding>,
  PreserveSource extends boolean = false,
  DispatchMessage = Message,
> = [CompositionDeliveryErrors<Message, Bindings>] extends [never]
  ? ValidDefineCompositionUpdate<
      Model,
      Message,
      OutMessage,
      Bindings,
      PreserveSource,
      DispatchMessage
    >
  : CompositionDeliveryErrors<Message, Bindings>

type RuntimeMessageConstructor = Schema.Top

/** @internal Runtime parent Message route retained outside the public Binding. */
export type RuntimeFromParentMessage = Readonly<{
  parentMessage: RuntimeMessageConstructor
  args: (
    model: unknown,
    message: Readonly<{ _tag: string }>,
  ) => Option.Option<ReadonlyArray<unknown>>
}>

/** @internal A mapper and stable provenance token shared by every lifted channel. */
export type TrackedParentMessageMapper<Mapper extends AnyFunction> = Readonly<{
  source: object
  toParentMessage: Mapper
}>

const ambiguousMessageSource = Symbol('foldkit/Block/AmbiguousMessageSource')
const messageSources = new WeakMap<
  object,
  object | typeof ambiguousMessageSource
>()

/** @internal Wraps one mapper once and records every object it produces. */
export function trackParentMessageMapper<Mapper extends AnyFunction>(
  mapper: Mapper,
): TrackedParentMessageMapper<Mapper>
export function trackParentMessageMapper(
  mapper: AnyFunction,
): TrackedParentMessageMapper<AnyFunction> {
  const source = {}
  const toParentMessage = (...args: ReadonlyArray<any>): any => {
    const message = mapper(...args)
    if (Predicate.isObject(message)) {
      const previousSource = messageSources.get(message)
      if (previousSource === undefined) {
        messageSources.set(message, source)
      } else if (
        previousSource !== source &&
        previousSource !== ambiguousMessageSource
      ) {
        messageSources.set(message, ambiguousMessageSource)
      }
    }
    return message
  }

  return { source, toParentMessage }
}

type RuntimeBindingDelivery = Readonly<{
  source: object
  outgoingParentMessage?: RuntimeMessageConstructor
  fromParentMessage?: RuntimeFromParentMessage
}>

const bindingDeliveries = new WeakMap<object, RuntimeBindingDelivery>()

/** @internal Associates one Binding with its tracked mapper and incoming route. */
export const registerBindingDelivery = (
  binding: object,
  trackedMapper: TrackedParentMessageMapper<AnyFunction>,
  config: Readonly<{
    outgoingParentMessage?: RuntimeMessageConstructor
    fromParentMessage?: RuntimeFromParentMessage
  }>,
): void => {
  bindingDeliveries.set(binding, {
    source: trackedMapper.source,
    ...(config.outgoingParentMessage === undefined
      ? {}
      : { outgoingParentMessage: config.outgoingParentMessage }),
    ...(config.fromParentMessage === undefined
      ? {}
      : { fromParentMessage: config.fromParentMessage }),
  })
}

const messageTagOf = (constructor: object): string => {
  const fields = Reflect.get(constructor, 'fields')
  const tagSchema = Predicate.isObject(fields)
    ? Reflect.get(fields, '_tag')
    : undefined
  const tagAst = Schema.isSchema(tagSchema)
    ? SchemaAST.toType(tagSchema.ast)
    : undefined

  if (
    tagAst === undefined ||
    !SchemaAST.isLiteral(tagAst) ||
    !Predicate.isString(tagAst.literal)
  ) {
    throw new Error(
      '[foldkit] fromParentMessage.parentMessage must be an exact Message variant constructor.',
    )
  }

  return tagAst.literal
}

type RuntimeRoute = Readonly<{
  binding: Readonly<{ placement: string; fold: AnyFunction }>
  source: object
  args: RuntimeFromParentMessage['args']
}>

const gotMessagePattern = /^Got.+/

/** @internal Public operations may publish only this Block's local facts. */
export const assertLocalOperationTag = (
  tag: unknown,
  bindings: ReadonlyArray<AnyBinding>,
): void => {
  if (!Predicate.isString(tag)) {
    throw new Error(
      '[foldkit] A Block operation must publish a tagged Message.',
    )
  }

  const isRouted = bindings.some(binding => {
    const incoming = bindingDeliveries.get(binding)?.fromParentMessage

    return (
      incoming !== undefined && messageTagOf(incoming.parentMessage) === tag
    )
  })

  if (gotMessagePattern.test(tag) || isRouted) {
    throw new Error(
      `[foldkit] A Block operation cannot publish child wrapper Message "${tag}". Declare a local Message for the Block's operation.`,
    )
  }
}

/** @internal Checks constructor operations without constructing a Message. */
export const assertLocalOperationMessage = (
  constructor: object,
  bindings: ReadonlyArray<AnyBinding>,
): void => assertLocalOperationTag(messageTagOf(constructor), bindings)

const observableUpdateContextArities = new WeakMap<object, number>()

const observableUpdateContextArity = (update: AnyFunction): number =>
  observableUpdateContextArities.get(update) ?? Math.max(0, update.length - 2)

/** @internal Retains observable declared context parameters through generated update wrappers. */
export const hasObservableUpdateContext = (update: AnyFunction): boolean =>
  observableUpdateContextArity(update) > 0

type RuntimeAuthoredUpdate = Readonly<Record<string, AnyFunction>>

type RuntimeDefineCompositionUpdate = {
  (cases: RuntimeAuthoredUpdate): AnyFunction
  readonly withContext: (createCases: AnyFunction) => AnyFunction
  readonly complete: (update: AnyFunction) => AnyFunction
}

const assertUnambiguousSource = (
  message: object,
  route: RuntimeRoute,
): void => {
  const source = messageSources.get(message)
  if (source !== undefined && source !== route.source) {
    throw new Error(
      `[foldkit] Parent Message "${Reflect.get(message, '_tag')}" is reserved by child Binding "${route.binding.placement}" but was emitted by another child Binding. Give each Binding a distinct parent Message variant.`,
    )
  }
}

/** @internal Creates the runtime Composition update delivery dispatcher. */
export const makeCompositionUpdate = (
  parentMessageSchema: Schema.Top,
  bindings: ReadonlyArray<Readonly<{ placement: string; fold: AnyFunction }>>,
  validateCoverage = true,
): RuntimeDefineCompositionUpdate => {
  const messageContract = runtimeMessageSchemaContract(parentMessageSchema)
  const routes = new Map<string, RuntimeRoute>()
  const outgoingTags = new Map<
    string,
    Array<Readonly<{ placement: string; source: object }>>
  >()

  for (const childBinding of bindings) {
    const delivery = bindingDeliveries.get(childBinding)
    if (delivery === undefined) {
      throw new Error(
        `[foldkit] Delivery metadata is unavailable for child Binding "${childBinding.placement}". Create Bindings through the parent Definition.makeBinding method.`,
      )
    }

    if (delivery.outgoingParentMessage !== undefined) {
      const outgoingTag = messageTagOf(delivery.outgoingParentMessage)
      const producers = outgoingTags.get(outgoingTag) ?? []
      producers.push({
        placement: childBinding.placement,
        source: delivery.source,
      })
      outgoingTags.set(outgoingTag, producers)
    }

    if (delivery.fromParentMessage === undefined) {
      continue
    }

    const incomingTag = messageTagOf(delivery.fromParentMessage.parentMessage)
    if (!messageContract.tags.has(incomingTag)) {
      throw new Error(
        `[foldkit] Child Binding "${childBinding.placement}" claims parent Message "${incomingTag}", but the parent Message Schema does not declare that variant.`,
      )
    }
    const previousRoute = routes.get(incomingTag)
    if (previousRoute !== undefined) {
      throw new Error(
        `[foldkit] Child Bindings "${previousRoute.binding.placement}" and "${childBinding.placement}" both claim parent Message "${incomingTag}". Give each Binding a distinct incoming Message variant.`,
      )
    }

    routes.set(incomingTag, {
      binding: childBinding,
      source: delivery.source,
      args: delivery.fromParentMessage.args,
    })
  }

  for (const [tag, route] of routes) {
    const conflictingProducer = outgoingTags
      .get(tag)
      ?.find(producer => producer.source !== route.source)
    if (conflictingProducer !== undefined) {
      throw new Error(
        `[foldkit] Parent Message "${tag}" is routed to child Binding "${route.binding.placement}" but child Binding "${conflictingProducer.placement}" also produces it. Give the Bindings distinct parent Message variants.`,
      )
    }
  }

  if (validateCoverage) {
    for (const tag of messageContract.gotWrapperTags) {
      if (!routes.has(tag)) {
        throw new Error(
          `[foldkit] Parent Message "${tag}" is a Got* child wrapper without an owning Binding. Register exactly one child Binding with an incoming route for this variant.`,
        )
      }
    }
  }

  const ownedUpdates = new WeakSet<AnyFunction>()

  const applyCases = (
    cases: Readonly<Record<string, AnyFunction>>,
    model: any,
    message: any,
  ) => {
    const messageTag = Predicate.isObject(message)
      ? Reflect.get(message, '_tag')
      : undefined
    const handler = Predicate.isString(messageTag)
      ? Reflect.get(cases, messageTag)
      : undefined

    if (!Predicate.isFunction(handler)) {
      throw new Error(
        `[foldkit] Composition.makeUpdate has no authored handler for Message "${globalThis.String(messageTag)}".`,
      )
    }

    return handler(model, message)
  }

  const makeUpdateFromCases = (
    createCases: (...context: ReadonlyArray<any>) => RuntimeAuthoredUpdate,
    contextArity: number,
  ): AnyFunction => {
    const dispatch = (
      model: any,
      message: any,
      ...context: ReadonlyArray<any>
    ) =>
      withOperationGraph(bindings, () => {
        const messageTag = Predicate.isObject(message)
          ? Reflect.get(message, '_tag')
          : undefined
        const route = Predicate.isString(messageTag)
          ? routes.get(messageTag)
          : undefined

        if (route === undefined) {
          if (
            Predicate.isString(messageTag) &&
            gotMessagePattern.test(messageTag)
          ) {
            throw new Error(
              `[foldkit] Composition.makeUpdate received Got* child wrapper "${messageTag}" without an owning Binding.`,
            )
          }
          const output = applyCases(createCases(...context), model, message)
          const resolved = resolveOperationOutput(output, model)
          return isBindingInitRecipe(resolved)
            ? runBindingInitRecipe(resolved)
            : resolved
        }

        assertUnambiguousSource(message, route)
        const maybeArguments = route.args(model, message)
        if (!Option.isOption(maybeArguments)) {
          throw new Error(
            `[foldkit] Child Binding "${route.binding.placement}" fromParentMessage.args must return an Option of fold arguments.`,
          )
        }
        if (Option.isNone(maybeArguments)) {
          return { model }
        }
        if (!globalThis.Array.isArray(maybeArguments.value)) {
          throw new Error(
            `[foldkit] Child Binding "${route.binding.placement}" fromParentMessage.args must contain a fold argument tuple.`,
          )
        }

        return resolveOperationOutput(
          route.binding.fold(model, ...maybeArguments.value),
          model,
        )
      })

    const dualDispatch = function (
      modelOrMessage: any,
      message: any,
      ...context: ReadonlyArray<any>
    ): AnyUpdateReturn | AnyFunction {
      if (arguments.length === 1) {
        return (model: any, ...curriedContext: ReadonlyArray<any>) =>
          dispatch(model, modelOrMessage, ...curriedContext)
      }

      return dispatch(modelOrMessage, message, ...context)
    }

    observableUpdateContextArities.set(dualDispatch, contextArity)
    ownedUpdates.add(dualDispatch)

    return dualDispatch
  }

  const makeUpdate = (cases: RuntimeAuthoredUpdate): AnyFunction => {
    if (!Predicate.isObject(cases) || Predicate.isFunction(cases)) {
      throw new Error(
        '[foldkit] Composition.makeUpdate requires an exhaustive handler record.',
      )
    }

    return makeUpdateFromCases(() => cases, 0)
  }

  return Object.assign(makeUpdate, {
    withContext: (createCases: AnyFunction) =>
      makeUpdateFromCases(createCases, createCases.length),
    complete: (update: AnyFunction) => {
      if (!ownedUpdates.has(update)) {
        throw new Error(
          '[foldkit] Block update must be authored with this Composition.makeUpdate.',
        )
      }

      return update
    },
  })
}
