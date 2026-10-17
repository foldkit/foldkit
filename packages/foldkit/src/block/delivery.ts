import { Option, Predicate, Schema, SchemaAST } from 'effect'

import type * as Update from '../update/index.js'
import { resolveOperationOutput } from '../update/operationRecipe.js'
import type { AnyBinding, RequirementsOfBindings } from './binding.js'
import type { DefinedUpdate, DefinedUpdateSource } from './definition.js'
import {
  type AnyBindingInitRecipe,
  type BindingInitRecipe,
  type BindingInitRecipeReturn,
  isBindingInitRecipe,
  runBindingInitRecipe,
} from './initRecipe.js'
import { withOperationGraph } from './operationGraph.js'

type AnyFunction = (...args: ReadonlyArray<any>) => any

type AnyUpdateReturn = Readonly<{
  model: any
  commands?: ReadonlyArray<any> | undefined
  outMessage?: any
}>

/** @internal Carries exact incoming and outgoing Message evidence for delivery. */
declare const BindingDeliveryTypeId: unique symbol

/** @internal Exact delivery evidence retained by a Binding. */
export interface BindingDeliveryEvidence<OutgoingMessage, IncomingMessage> {
  readonly [BindingDeliveryTypeId]: Readonly<{
    outgoingMessage: OutgoingMessage
    incomingMessage: IncomingMessage
  }>
}

/** @internal Recovers the exact parent Message produced by a Binding mapper. */
export type OutgoingMessageOfBinding<BindingValue> =
  BindingValue extends BindingDeliveryEvidence<infer OutgoingMessage, any>
    ? OutgoingMessage
    : never

/** @internal Recovers the exact parent Message variant claimed by a Binding. */
export type IncomingMessageOfBinding<BindingValue> =
  BindingValue extends BindingDeliveryEvidence<any, infer IncomingMessage>
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

type MessageTag<Message> =
  Message extends Readonly<{
    _tag: infer Tag extends string
  }>
    ? Tag
    : never

type IncomingMessageTag<BindingValue> = MessageTag<
  IncomingMessageOfBinding<BindingValue>
>

type OutgoingMessageTag<BindingValue> = MessageTag<
  OutgoingMessageOfBinding<BindingValue>
>

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

type IsUnion<Value, Whole = Value> = Value extends unknown
  ? [Whole] extends [Value]
    ? false
    : true
  : never

type ConflictingDeliveryTags<IncomingIndexes, OutgoingIndexes> = {
  [Tag in keyof IncomingIndexes]: true extends IsUnion<
    | IncomingIndexes[Tag]
    | (Tag extends keyof OutgoingIndexes ? OutgoingIndexes[Tag] : never)
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

/** Rejects incoming parent Message variants claimed or produced by multiple Bindings. */
export type ValidateCompositionDelivery<
  Bindings extends ReadonlyArray<unknown>,
> = [DeliveryConflicts<Bindings>] extends [never]
  ? unknown
  : DeliveryConflicts<Bindings>

type RoutedMessage<Bindings extends ReadonlyArray<unknown>> =
  IncomingMessageOfBinding<Bindings[number]>

type AuthoredMessage<
  Message,
  Bindings extends ReadonlyArray<unknown>,
> = Exclude<Message, RoutedMessage<Bindings>>

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

type OwnedReturn<Model, Message, OutMessage> = Readonly<{
  model: Model
  commands?: Update.Commands<Message, any> | undefined
  outMessage?: OutMessage
}>

type ResolvedAuthoredOutput<Output> = Output extends AnyBindingInitRecipe
  ? BindingInitRecipeReturn<Output>
  : Update.ResolvedOperationOutput<Output>

type RouteRequirements<Bindings extends ReadonlyArray<unknown>> =
  RouteFold<Bindings> extends infer Fold extends AnyFunction
    ? Update.RequirementsOf<
        () => Update.ResolvedOperationOutput<ReturnType<Fold>>
      >
    : never

type RouteOutMessage<Bindings extends ReadonlyArray<unknown>> =
  ReturnOutMessage<
    Update.ResolvedOperationOutput<ReturnType<RouteFold<Bindings>>>
  >

type RouteRegistration<Bindings extends ReadonlyArray<unknown>> =
  Update.RegistrationEvidenceOf<
    Update.ResolvedOperationOutput<ReturnType<RouteFold<Bindings>>>
  >

type AuthoredRequirements<Output> = Update.RequirementsOf<() => Output>

type AuthoredRegistration<Output> = Update.RegistrationEvidenceOf<Output>

type CompositionDefinedUpdateValue<
  Model,
  Message,
  Context extends ReadonlyArray<unknown>,
  Output,
  Bindings extends ReadonlyArray<unknown>,
> = DefinedUpdate<
  Model,
  Message,
  Context,
  ReturnOutMessage<ResolvedAuthoredOutput<Output>> | RouteOutMessage<Bindings>,
  | AuthoredRequirements<ResolvedAuthoredOutput<Output>>
  | RouteRequirements<Bindings>,
  | AuthoredRegistration<ResolvedAuthoredOutput<Output>>
  | RouteRegistration<Bindings>
>

type CompositionDefinedUpdate<
  Model,
  Message,
  Context extends ReadonlyArray<unknown>,
  Output,
  Bindings extends ReadonlyArray<unknown>,
  PreserveSource extends boolean,
> = CompositionDefinedUpdateValue<Model, Message, Context, Output, Bindings> &
  ([PreserveSource] extends [true]
    ? DefinedUpdateSource<
        readonly [
          Model,
          Message,
          Context,
          ReturnType<
            CompositionDefinedUpdateValue<
              Model,
              Message,
              Context,
              Output,
              Bindings
            >
          >,
        ]
      >
    : unknown)

type RoutedOnlyUpdate<
  Model,
  Message,
  Bindings extends ReadonlyArray<unknown>,
  PreserveSource extends boolean,
> = CompositionDefinedUpdate<
  Model,
  Message,
  readonly [],
  Readonly<{ model: Model }>,
  Bindings,
  PreserveSource
>

type ValidDefineCompositionUpdate<
  Model,
  Message,
  OutMessage,
  Bindings extends ReadonlyArray<AnyBinding>,
  PreserveSource extends boolean,
> = [AuthoredMessage<Message, Bindings>] extends [never]
  ? () => RoutedOnlyUpdate<Model, Message, Bindings, PreserveSource>
  : <
      const Context extends ReadonlyArray<unknown>,
      const Output extends (
        | OwnedReturn<Model, Message, OutMessage>
        | BindingInitRecipe<Model, Message, any, any>
        | Update.ResultRecipe<Model, Message, OutMessage, any, unknown>
      ) &
        ValidateAnnotatedContext<Context>,
    >(
      update: (
        model: Update.CompositionInput<Model, RequirementsOfBindings<Bindings>>,
        message: AuthoredMessage<Message, Bindings>,
        ...context: Context
      ) => Output,
    ) => CompositionDefinedUpdate<
      Model,
      Message,
      Context,
      Output,
      Bindings,
      PreserveSource
    >

/**
 * Authors a Composition update after child Bindings claim their incoming
 * parent Message variants. The callback handles only unclaimed Messages; the
 * returned update accepts the complete parent Message union.
 */
export type DefineCompositionUpdate<
  Model,
  Message,
  OutMessage,
  Bindings extends ReadonlyArray<AnyBinding>,
  PreserveSource extends boolean = false,
> = [DeliveryConflicts<Bindings>] extends [never]
  ? ValidDefineCompositionUpdate<
      Model,
      Message,
      OutMessage,
      Bindings,
      PreserveSource
    >
  : DeliveryConflicts<Bindings>

type RuntimeMessageConstructor = Schema.Top & AnyFunction

/** @internal Runtime parent Message route retained outside the public Binding. */
export type RuntimeFromParentMessage =
  | false
  | Readonly<{
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
  fromParentMessage: RuntimeFromParentMessage
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
    fromParentMessage: config.fromParentMessage ?? false,
  })
}

const messageTagOf = (constructor: RuntimeMessageConstructor): string => {
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
  args: Exclude<RuntimeFromParentMessage, false>['args']
}>

const observableUpdateContextArities = new WeakMap<object, number>()

const observableUpdateContextArity = (update: AnyFunction): number =>
  observableUpdateContextArities.get(update) ?? Math.max(0, update.length - 2)

/** @internal Retains observable declared context parameters through generated update wrappers. */
export const hasObservableUpdateContext = (update: AnyFunction): boolean =>
  observableUpdateContextArity(update) > 0

type RuntimeDefineCompositionUpdate = (
  update?: AnyFunction,
) => (...args: ReadonlyArray<any>) => AnyUpdateReturn

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
  childBindings: ReadonlyArray<
    Readonly<{ placement: string; fold: AnyFunction }>
  >,
): RuntimeDefineCompositionUpdate => {
  const routes = new Map<string, RuntimeRoute>()
  const outgoingTags = new Map<
    string,
    Array<Readonly<{ placement: string; source: object }>>
  >()

  for (const childBinding of childBindings) {
    const delivery = bindingDeliveries.get(childBinding)
    if (delivery === undefined) {
      throw new Error(
        `[foldkit] Delivery metadata is unavailable for child Binding "${childBinding.placement}". Create Bindings through the parent Definition.bindChild method.`,
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

    if (delivery.fromParentMessage === false) {
      continue
    }

    const incomingTag = messageTagOf(delivery.fromParentMessage.parentMessage)
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

  return update => {
    const dispatch = (
      model: any,
      message: any,
      ...context: ReadonlyArray<any>
    ) =>
      withOperationGraph(childBindings, () => {
        const messageTag = Predicate.isObject(message)
          ? Reflect.get(message, '_tag')
          : undefined
        const route = Predicate.isString(messageTag)
          ? routes.get(messageTag)
          : undefined

        if (route === undefined) {
          if (update === undefined) {
            throw new Error(
              `[foldkit] Composition.makeUpdate received unclaimed Message "${Predicate.isObject(message) ? Reflect.get(message, '_tag') : globalThis.String(message)}" without an authored handler.`,
            )
          }
          const output = update(model, message, ...context)
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

    observableUpdateContextArities.set(
      dispatch,
      update === undefined ? 0 : observableUpdateContextArity(update),
    )

    return dispatch
  }
}
