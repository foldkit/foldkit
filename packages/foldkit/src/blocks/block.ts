import {
  Context,
  Effect,
  Effectable,
  Layer,
  Option,
  Predicate,
  Schema,
  type Scope,
  type Stream,
} from 'effect'

import type { Document, Html, HtmlBuilder } from '../html/index.js'
import {
  type AnyCommand,
  type AnyHandlerDefinition,
  type BlockMessage,
  BlockParent,
  GateEntryTypeId,
  type InstancePath,
  InstanceTypeId,
  type NotConnected,
  OnEntryTypeId,
  type OnTarget,
  type RuntimeBlock,
  type RuntimeConstructor,
  type RuntimeHandlers,
  type RuntimeInstance,
  SendTypeId,
  blockMessage,
  instanceGraph,
  instancePath,
  isInstance,
  makePending,
  registerCollection,
  renderInstance,
  use,
} from './engine.js'
import { instanceJsonLink } from './preservation.js'

export type { BlockMessage, Path } from './engine.js'
export { InstancePath, NotConnected, isBlockMessage } from './engine.js'

// CONTRACT

type AnyDefinition = Readonly<{
  name: string
  toLayer: (...args: ReadonlyArray<any>) => unknown
}>

/** The contract a Block class declares: its Schemas and the Commands and
 *  Mounts it owns. It contains no implementation. */
export type Contract = Readonly<{
  Model?: Schema.Top
  Message?: Schema.Top
  OutMessage?: Schema.Top
  Command?: ReadonlyArray<AnyDefinition>
  Mount?: ReadonlyArray<AnyDefinition>
}>

/** The Model type a contract declares, or `undefined` for a Block without
 *  state. */
export type ModelOf<C extends Contract> = C extends {
  readonly Model: infer S extends Schema.Top
}
  ? S['Type']
  : undefined

/** The Message type a contract declares, or `never`. */
export type MessageOf<C extends Contract> = C extends {
  readonly Message: infer S extends Schema.Top
}
  ? S['Type']
  : never

/** The OutMessage type a contract declares, or `never`. */
export type OutMessageOf<C extends Contract> = C extends {
  readonly OutMessage: infer S extends Schema.Top
}
  ? S['Type']
  : never

type DefinitionsOf<C extends Contract, Key extends 'Command' | 'Mount'> =
  C extends Readonly<Record<Key, infer Definitions>>
    ? Definitions extends ReadonlyArray<infer Definition>
      ? Definition
      : never
    : never

type Tagged = Readonly<{ _tag: string }>

type InvocationOf<Definition> = Definition extends (
  ...args: ReadonlyArray<any>
) => infer Invocation
  ? Invocation
  : never

type InterruptOf<Definition> =
  Definition extends Readonly<{
    Interrupt: infer Interrupt
  }>
    ? InvocationOf<Interrupt>
    : never

/** A Command whose result is one of the Block's Messages. */
type MessageCommand<Message> = Readonly<{
  name: string
  args?: Readonly<Record<string, unknown>>
  effect: Effect.Effect<Message, any, any>
}>

/** The Command values a Block's update may return: invocations of its listed
 *  Commands, their `Interrupt` Commands, and any Command whose result is one
 *  of the Block's Messages. */
type CommandOf<Definitions, Message> =
  | InvocationOf<Definitions>
  | InterruptOf<Definitions>
  | MessageCommand<Message>

type HandlerOf<Definition> =
  Definition extends Readonly<{
    toLayer: (...args: infer Parameters) => unknown
  }>
    ? Parameters[0] extends Effect.Effect<infer Handler, any, any>
      ? WithAnyRequirements<Handler>
      : never
    : never

/** A handler may use the services the runtime provides while it runs. */
type WithAnyRequirements<Handler> = Handler extends (
  ...args: infer Args
) => Effect.Effect<infer Success, infer Failure, any>
  ? (...args: Args) => Effect.Effect<Success, Failure, any>
  : Handler extends (
        ...args: infer Args
      ) => Stream.Stream<infer Success, infer Failure, any>
    ? (...args: Args) => Stream.Stream<Success, Failure, any>
    : Handler

type HandlerRecord<Definitions> = {
  readonly [
    Definition in Definitions as Definition extends Readonly<{
      name: infer Name extends string
    }>
      ? Name
      : never
  ]: HandlerOf<Definition>
}

// UPDATE

/** @internal Types the OutMessage handler entries spread into an update record. */
export const OnSlotTypeId: unique symbol = Symbol.for('foldkit/Block/OnSlot')

/** A Message sent from a parent to one of its child instances. Return it under
 *  `messages` from an update handler. */
export interface Send {
  readonly [SendTypeId]: true
}

/** OutMessage handlers for one child instance or collection, spread into the
 *  parent's update record. */
export interface OnEntry<Model> {
  readonly [OnSlotTypeId]: (model: Model) => Model
}

/** What an update handler returns. */
export type Result<Model, OutMessage, Command> = Readonly<{
  model: Model
  commands?: ReadonlyArray<Command> | undefined
  outMessage?: OutMessage | undefined
  messages?: ReadonlyArray<Send> | undefined
}>

type UpdateHandlers<Model, Message, OutMessage, Command> = [Message] extends [
  never,
]
  ? {}
  : [Message] extends [Tagged]
    ? {
        readonly [Tag in Message['_tag']]: (
          model: Model,
          message: Extract<Message, Readonly<{ _tag: Tag }>>,
        ) => Result<Model, OutMessage, Command>
      }
    : never

/** The update record a Block implementation returns: one handler per Message,
 *  plus the OutMessage handler entries of its children. */
export type UpdateRecord<Model, Message, OutMessage, Command> = UpdateHandlers<
  Model,
  Message,
  OutMessage,
  Command
> & { readonly [OnSlotTypeId]?: (model: Model) => Model }

type OutMessageHandler<ParentModel, OutMessage, Tag, Instance> = (
  model: ParentModel,
  outMessage: Extract<OutMessage, Readonly<{ _tag: Tag }>>,
  instance: Instance,
) => Result<ParentModel, unknown, AnyCommand>

/** OutMessage handlers keyed by OutMessage tag. Each receives the parent
 *  Model, the OutMessage, and the child instance that reported it. */
export type OutMessageHandlers<ParentModel, OutMessage, Instance> = [
  OutMessage,
] extends [never]
  ? {}
  : [OutMessage] extends [Tagged]
    ? {
        readonly [Tag in OutMessage['_tag']]?: OutMessageHandler<
          ParentModel,
          OutMessage,
          Tag,
          Instance
        >
      }
    : never

/** OutMessage handlers with one handler for every OutMessage tag. */
export type AllOutMessageHandlers<ParentModel, OutMessage, Instance> = [
  OutMessage,
] extends [never]
  ? {}
  : [OutMessage] extends [Tagged]
    ? {
        readonly [Tag in OutMessage['_tag']]: OutMessageHandler<
          ParentModel,
          OutMessage,
          Tag,
          Instance
        >
      }
    : never

/** Command handlers supplied by a Layer outside the Block. A Block whose
 *  constructor returns no `commands` requires this service; its `handlers`
 *  method provides it. */
export interface Handlers<Self> {
  readonly [HandlersTypeId]: Self
}

/** @internal Brands the {@link Handlers} service type. */
export const HandlersTypeId: unique symbol = Symbol.for(
  'foldkit/Block/Handlers',
)

// IMPLEMENTATION

type ModelSlot<Model> = [Model] extends [undefined]
  ? { readonly model?: undefined }
  : { readonly model: Model }

type UpdateSlot<Model, Message, OutMessage, Command> = [Message] extends [never]
  ? { readonly update?: UpdateRecord<Model, Message, OutMessage, Command> }
  : { readonly update: UpdateRecord<Model, Message, OutMessage, Command> }

type HandlersSlot<Key extends string, Definitions> = [Definitions] extends [
  never,
]
  ? { readonly [K in Key]?: undefined }
  : { readonly [K in Key]: HandlerRecord<Definitions> }

type OptionalHandlersSlot<Key extends string, Definitions> = [
  Definitions,
] extends [never]
  ? { readonly [K in Key]?: undefined }
  : { readonly [K in Key]?: HandlerRecord<Definitions> }

/** A Stream that runs while its dependencies stay the same. The runtime
 *  recomputes the dependencies from the instance's Model after every update
 *  and restarts the Stream when they change. */
export type Subscription<Model, Message> = Readonly<{
  dependencies: (model: Model) => unknown
  stream: (
    dependencies: any,
    readDependencies: () => any,
  ) => Stream.Stream<Message>
  /** Keeps the Stream running when it returns true for the previous and
   *  next dependencies. The Stream reads the latest dependencies through
   *  `readDependencies`. */
  keepAliveEquivalence?: (previous: any, next: any) => boolean
}>

type ExposeSlot<Exposed> = [Exposed] extends [never]
  ? { readonly expose?: undefined }
  : { readonly expose: Exposed }

type MountRequirementsOf<Definition> =
  InvocationOf<Definition> extends Readonly<{
    f: (...args: ReadonlyArray<any>) => Stream.Stream<any, any, infer R>
  }>
    ? R
    : never

type ViewFunction<Model, Message, ViewInput, MountRequirements> = [
  ViewInput,
] extends [void]
  ? (
      model: Model,
      h: HtmlBuilder<Message, MountRequirements>,
    ) => Html | Document
  : (
      model: Model,
      h: HtmlBuilder<Message, MountRequirements>,
      input: ViewInput,
    ) => Html | Document

/** What a Block constructor returns: the starting Model, the Commands to run
 *  when the instance enters the Model (`start`), the update handlers, the
 *  view, Command and Mount handlers, a Stream of Messages that runs while the
 *  instance exists, Subscriptions that depend on its Model, and a value the
 *  instance exposes to its parent's Commands. A constructor that omits
 *  `commands` leaves its Command handlers to the Block's `handlers` Layer. */
export type Implementation<
  C extends Contract,
  ViewInput = void,
  Exposed = never,
> = ModelSlot<ModelOf<C>> &
  UpdateSlot<
    ModelOf<C>,
    MessageOf<C>,
    OutMessageOf<C>,
    CommandOf<DefinitionsOf<C, 'Command'>, MessageOf<C>>
  > &
  OptionalHandlersSlot<'commands', DefinitionsOf<C, 'Command'>> &
  HandlersSlot<'mounts', DefinitionsOf<C, 'Mount'>> &
  ExposeSlot<Exposed> &
  Readonly<{
    view?: ViewFunction<
      ModelOf<C>,
      MessageOf<C>,
      ViewInput,
      MountRequirementsOf<DefinitionsOf<C, 'Mount'>>
    >
    stream?: Stream.Stream<MessageOf<C>>
    subscriptions?: Readonly<
      Record<string, Subscription<ModelOf<C>, MessageOf<C>>>
    >
    start?: ReadonlyArray<CommandOf<DefinitionsOf<C, 'Command'>, MessageOf<C>>>
  }>

// INSTANCE

/** The members of a Block instance. Create one with `new Block(id, args)` in
 *  a parent constructor and put it in the parent's Model. While it is in the
 *  Model it holds its current Model and renders itself. */
export interface InstanceMembers<
  Self,
  C extends Contract,
  Args = void,
  ViewInput = void,
  Exposed = never,
> {
  /** The instance id, unique within its parent. */
  readonly id: string
  /** The instance's current Model. */
  readonly model: ModelOf<C>
  /** Renders the instance. Its Messages are routed back to it. Functions in
   *  the input run as the parent, so the Messages they create are the
   *  parent's. */
  view(...input: [ViewInput] extends [void] ? [] : [input: ViewInput]): Html
  /** Creates a Message for this instance. Return it under `messages` from a
   *  parent update handler. */
  send(message: MessageOf<C>): Send
  /** Handles this instance's OutMessages in the parent. Spread the result
   *  into the parent's update record. An OutMessage without a handler is
   *  dropped. */
  on<ParentModel>(
    handlers: OutMessageHandlers<ParentModel, OutMessageOf<C>, Self>,
  ): OnEntry<ParentModel>
  /** Handles every OutMessage of this instance in the parent. Like `on`,
   *  but it requires a handler for each OutMessage tag, so adding an
   *  OutMessage to the child is a type error until the parent handles it. */
  onAll<ParentModel>(
    handlers: AllOutMessageHandlers<ParentModel, OutMessageOf<C>, Self>,
  ): OnEntry<ParentModel>
  /** Gates the Messages this instance receives. A Message from the
   *  instance's view, Commands, Stream, or Subscriptions reaches its update
   *  only when the predicate returns true for the parent's current Model and
   *  the Message; otherwise it is dropped. Messages the parent sends with
   *  `send` are not gated. Spread the result into the parent's update
   *  record. */
  when<ParentModel>(
    predicate: (model: ParentModel, message: MessageOf<C>) => boolean,
  ): OnEntry<ParentModel>
  /** The value the instance exposes. Fails with `NotConnected` while the
   *  instance is not in its parent's Model. */
  readonly use: Effect.Effect<Exposed, NotConnected>
  /** @internal Carries the constructor args type. */
  readonly '~args'?: (args: Args) => Args
}

/** A factory returned by `yield* Block.each(...)`. Calling it with a key
 *  creates a new instance, constructed when it is put into the Model. Putting
 *  it in place of a live instance with the same key replaces that instance:
 *  its scope closes and the new one starts from its constructor's Model. To
 *  keep a row's state, keep its existing instance in the collection and call
 *  the factory only for new keys. */
export interface Factory<
  Self,
  C extends Contract,
  Args = void,
  HasDefaultArgs extends boolean = true,
> {
  /** Creates the instance for `key`. Args given here override the factory's
   *  args; a factory created without args requires them on every call. */
  (
    key: string,
    ...args: [Args] extends [void]
      ? []
      : HasDefaultArgs extends true
        ? [args?: Args]
        : [args: Args]
  ): Self
  /** Handles OutMessages from every instance this factory creates. */
  on<ParentModel>(
    handlers: OutMessageHandlers<ParentModel, OutMessageOf<C>, Self>,
  ): OnEntry<ParentModel>
  /** Handles every OutMessage of every instance this factory creates,
   *  requiring a handler for each OutMessage tag. */
  onAll<ParentModel>(
    handlers: AllOutMessageHandlers<ParentModel, OutMessageOf<C>, Self>,
  ): OnEntry<ParentModel>
  /** Gates the Messages every instance this factory creates receives. See
   *  the instance's `when`. */
  when<ParentModel>(
    predicate: (model: ParentModel, message: MessageOf<C>) => boolean,
  ): OnEntry<ParentModel>
}

type HostHandlersRequirement<Self, C extends Contract, I> = [
  DefinitionsOf<C, 'Command'>,
] extends [never]
  ? never
  : I extends Readonly<{ commands: object }>
    ? never
    : Handlers<Self>

type ConstructorArgs<Args> = [Args] extends [void] ? [] : [args: Args]

/** A Block class. Declare one with
 *  `class Counter extends Block<Counter, Args>()('Counter', contract) {}`. */
export type BlockClass<
  Self,
  Id extends string,
  Args,
  ViewInput,
  Exposed,
  C extends Contract,
> = (new (
  id: string,
  ...args: ConstructorArgs<Args>
) => InstanceMembers<Self, C, Args, ViewInput, Exposed> &
  Effect.Effect<Self, never, Self | BlockParent>) &
  Omit<Schema.declare<Self>, 'make'> &
  Readonly<{
    /** The Block id. */
    id: Id
    /** The Model Schema. */
    Model: C['Model']
    /** The Message Schema and constructors. */
    Message: C['Message']
    /** The OutMessage Schema and constructors. */
    OutMessage: C['OutMessage']
    /** The Commands this Block owns. */
    Command: C['Command']
    /** The Mounts this Block owns. */
    Mount: C['Mount']
    /** Implements the Block. The constructor runs once per instance and
     *  receives the instance id and args. Returns a Layer that provides the
     *  Block to every parent that creates it. When the constructor returns
     *  no `commands`, the Layer requires the Block's `handlers` Layer. */
    make: <I extends Implementation<C, ViewInput, Exposed>, E, R>(
      constructor: (id: string, args: Args) => Effect.Effect<I, E, R>,
    ) => Layer.Layer<
      Self,
      E,
      | Exclude<R, BlockParent | InstancePath | Scope.Scope>
      | HostHandlersRequirement<Self, C, I>
    >
    /** Implements the Block's Command handlers outside its constructor. The
     *  constructor runs once when the Layer is built: it yields the services
     *  the handlers use and returns one handler per Command, so the handlers
     *  close over those services and require nothing themselves. A Block
     *  whose constructor returns no `commands` uses these handlers. Stories
     *  and scenes never run Command handlers, so they need no `handlers`
     *  Layer. */
    handlers: <E, R>(
      constructor: () => Effect.Effect<
        HandlerRecord<DefinitionsOf<C, 'Command'>>,
        E,
        R
      >,
    ) => Layer.Layer<Handlers<Self>, E, Exclude<R, Scope.Scope>>
    /** Creates a factory for a keyed collection of instances stored in the
     *  parent Model. */
    each: {
      (
        collection: string,
        ...args: ConstructorArgs<Args>
      ): Effect.Effect<Factory<Self, C, Args>, never, Self | BlockParent>
      (
        collection: string,
      ): Effect.Effect<Factory<Self, C, Args, false>, never, Self | BlockParent>
    }
  }>

const nonCopiedSchemaKeys: ReadonlySet<PropertyKey> = new Set([
  'constructor',
  'prototype',
  'name',
  'length',
  'caller',
  'arguments',
  'make',
])

const copySchemaMembers = (schema: object, target: object): void => {
  let current: object | null = schema
  while (
    current !== null &&
    current !== Object.prototype &&
    current !== Function.prototype
  ) {
    for (const key of Reflect.ownKeys(current)) {
      if (nonCopiedSchemaKeys.has(key) || Object.hasOwn(target, key)) {
        continue
      }
      const descriptor = Object.getOwnPropertyDescriptor(current, key)
      if (descriptor !== undefined) {
        Object.defineProperty(target, key, {
          ...descriptor,
          configurable: true,
        })
      }
    }
    current = Object.getPrototypeOf(current)
  }
}

const registry = new Set<RuntimeBlock>()
let blockCount = 0

/** @internal Every Block class created in this module. */
export const blockRegistry: ReadonlySet<RuntimeBlock> = registry

const RuntimeBlockTypeId = Symbol.for('foldkit/Block/RuntimeBlock')

const isRuntimeBlock = (value: unknown): value is RuntimeBlock =>
  Predicate.hasProperty(value, 'service') &&
  Predicate.hasProperty(value, 'prototype')

/** @internal Returns the engine view of a Block class. */
export const runtimeBlockOf = (block: object): RuntimeBlock => {
  const runtimeBlock: unknown = Reflect.get(block, RuntimeBlockTypeId)
  if (!isRuntimeBlock(runtimeBlock)) {
    throw new Error('[foldkit] Expected a Block class.')
  }
  return runtimeBlock
}

const onEntry = (target: OnTarget, handlers: unknown): unknown => ({
  [Symbol('foldkit/Block/on')]: {
    [OnEntryTypeId]: true,
    target,
    handlers,
  },
})

const gateEntry = (target: OnTarget, predicate: unknown): unknown => ({
  [Symbol('foldkit/Block/when')]: {
    [GateEntryTypeId]: true,
    target,
    predicate,
  },
})

/* eslint-disable @typescript-eslint/consistent-type-assertions */
const asRuntimeInstance = (instance: object): RuntimeInstance =>
  instance as RuntimeInstance

const asDefinitions = (
  definitions: ReadonlyArray<AnyDefinition> | undefined,
): ReadonlyArray<AnyHandlerDefinition> =>
  (definitions ?? []) as unknown as ReadonlyArray<AnyHandlerDefinition>
/* eslint-enable @typescript-eslint/consistent-type-assertions */

/**
 * Declares a Block class. The class is the Block's contract: its Model,
 * Message, OutMessage, Command, and Mount lists. Implement it with `make`,
 * create instances with `new` inside a parent constructor, and connect them by
 * putting them in the parent's Model.
 *
 * The type parameters are the class itself, its constructor args, the input
 * its view takes from a parent, and the value it exposes to the parent's
 * Commands.
 *
 * ```ts
 * export class Counter extends Block<Counter, { readonly max: number }>()('Counter', {
 *   Model: Schema.Struct({ count: Schema.Number }),
 *   Message: defineMessageUnion({ ClickedIncrement: {} }),
 * }) {}
 * ```
 */
export const Block =
  <Self, Args = void, ViewInput = void, Exposed = never>() =>
  <const Id extends string, const C extends Contract = {}>(
    id: Id,
    contract?: C,
  ): BlockClass<Self, Id, Args, ViewInput, Exposed, C> => {
    blockCount += 1
    const service = Context.Service<unknown, RuntimeConstructor>(
      `foldkit/Block/${id}#${blockCount}`,
    )
    const handlersService = Context.Service<unknown, RuntimeHandlers>(
      `foldkit/Block/${id}#${blockCount}/Handlers`,
    )

    const runtimeBlock: RuntimeBlock = {
      id,
      prototype: {},
      Command: asDefinitions(contract?.Command),
      Mount: asDefinitions(contract?.Mount),
      service,
      handlers: handlersService,
    }

    class Instance extends Effectable.Class<unknown, never, unknown> {
      declare readonly id: string
      declare readonly args: unknown

      constructor(instanceId: string, args?: unknown) {
        super()
        Object.defineProperty(this, 'id', {
          value: instanceId,
          enumerable: true,
        })
        Object.defineProperty(this, 'args', { value: args, enumerable: false })
      }

      asEffect(): Effect.Effect<unknown, never, unknown> {
        const { id: instanceId, args } = this
        return Effect.gen(function* () {
          const parent = yield* BlockParent
          const context = yield* Effect.context<never>()
          return makePending(
            {
              graph: parent.graph,
              block: runtimeBlock,
              path: [...parent.path, instanceId],
              args,
              context,
            },
            instanceId,
          )
        })
      }

      view(input?: unknown): unknown {
        return renderInstance(asRuntimeInstance(this), input)
      }

      send(message: unknown): unknown {
        return {
          [SendTypeId]: true,
          target: instancePath(asRuntimeInstance(this)),
          message,
        }
      }

      on(handlers: unknown): unknown {
        return onEntry(
          { kind: 'Instance', path: instancePath(asRuntimeInstance(this)) },
          handlers,
        )
      }

      onAll(handlers: unknown): unknown {
        return this.on(handlers)
      }

      when(predicate: unknown): unknown {
        return gateEntry(
          { kind: 'Instance', path: instancePath(asRuntimeInstance(this)) },
          predicate,
        )
      }

      get use(): Effect.Effect<unknown, NotConnected> {
        const instance = asRuntimeInstance(this)
        return use(instanceGraph(instance), instancePath(instance))
      }

      override toJSON(): unknown {
        return { _tag: id, id: this.id, model: Reflect.get(this, 'model') }
      }
    }

    Object.defineProperty(Instance.prototype, InstanceTypeId, { value: true })
    Object.defineProperty(runtimeBlock, 'prototype', {
      value: Instance.prototype,
    })
    registry.add(runtimeBlock)
    Object.defineProperty(Instance, RuntimeBlockTypeId, {
      value: runtimeBlock,
    })

    const schema = Schema.declare(
      (value: unknown): value is unknown =>
        isInstance(value) && value instanceof Instance,
      {
        identifier: id,
        toCodecJson: () => instanceJsonLink(runtimeBlock, contract?.Model),
      },
    )
    copySchemaMembers(schema, Instance)

    const statics = {
      id,
      Model: contract?.Model,
      Message: contract?.Message,
      OutMessage: contract?.OutMessage,
      Command: contract?.Command,
      Mount: contract?.Mount,
      make: (constructor: RuntimeConstructor) =>
        Layer.effect(
          service,
          Effect.map(
            Effect.context<never>(),
            (captured): RuntimeConstructor => {
              const maybeHostHandlers = Context.getOption(
                captured,
                handlersService,
              )
              return (instanceId, args) =>
                Effect.updateContext(constructor(instanceId, args), context =>
                  Context.merge(captured, context),
                ).pipe(
                  Effect.map(impl =>
                    impl.commands === undefined &&
                    Option.isSome(maybeHostHandlers)
                      ? { ...impl, commands: maybeHostHandlers.value }
                      : impl,
                  ),
                )
            },
          ),
        ),
      handlers: (
        constructor: () => Effect.Effect<RuntimeHandlers, unknown, unknown>,
      ) => Layer.effect(handlersService, Effect.suspend(constructor)),
      each: (collection: string, args?: unknown) =>
        Effect.gen(function* () {
          const parent = yield* BlockParent
          const context = yield* Effect.context<never>()
          const collectionPath = [...parent.path, collection]
          registerCollection({
            graph: parent.graph,
            block: runtimeBlock,
            path: collectionPath,
            args,
            context,
          })
          const factory = (key: string, ...keyArgs: ReadonlyArray<unknown>) =>
            makePending(
              {
                graph: parent.graph,
                block: runtimeBlock,
                path: [...collectionPath, key],
                args: keyArgs.length === 0 ? args : keyArgs[0],
                context,
              },
              key,
            )
          factory.on = (handlers: unknown) =>
            onEntry({ kind: 'Collection', path: collectionPath }, handlers)
          factory.onAll = factory.on
          factory.when = (predicate: unknown) =>
            gateEntry({ kind: 'Collection', path: collectionPath }, predicate)
          return factory
        }),
    }

    for (const [key, value] of Object.entries(statics)) {
      Object.defineProperty(Instance, key, {
        value,
        enumerable: true,
        configurable: true,
      })
    }

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    return Instance as unknown as BlockClass<
      Self,
      Id,
      Args,
      ViewInput,
      Exposed,
      C
    >
  }

/** Addresses a Message to a Block instance by its path from the root. Use it
 *  in tests to deliver a child's Message through its ancestors. */
export const deliver = <B extends Readonly<{ Message: unknown }>>(
  _block: B,
  path: string | ReadonlyArray<string>,
  message: B['Message'] extends Schema.Top ? B['Message']['Type'] : never,
): BlockMessage =>
  blockMessage(Predicate.isString(path) ? [path] : path, message)
