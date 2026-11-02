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
  type AnyHandlerDefinition,
  type BlockMessage,
  BlockTypeId,
  GateEntryTypeId,
  type InitContext,
  InstanceTypeId,
  OnEntryTypeId,
  type RuntimeBlock,
  type RuntimeImplementation,
  type RuntimeInstance,
  type RuntimeModule,
  SendTypeId,
  blockMessage,
  defineInstanceFields,
  isInstance,
  makeModule,
  renderInstance,
} from './engine.js'
import { instanceJsonLink } from './preservation.js'

export type { BlockMessage, InitContext, Path } from './engine.js'
export { isBlockMessage } from './engine.js'

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
      : WithAnyRequirements<Parameters[0]>
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

/** A Message sent from a parent to one of its children. Return it under
 *  `messages` from an update handler. */
export interface Send {
  readonly [SendTypeId]: true
}

/** OutMessage handlers or a Message gate for one child Block, spread into
 *  the parent's update record. It carries the Model, OutMessage, and Command
 *  types its handlers return, so the parent's update record accepts it only
 *  when they are the parent's own. */
export interface OnEntry<Model, OutMessage = never, Command = never> {
  readonly [OnSlotTypeId]: (model: Model) => Result<Model, OutMessage, Command>
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

/** The update record a Block's Layer returns: one handler per Message, plus
 *  the OutMessage handlers and gates of the Blocks its Model holds. */
export type UpdateRecord<Model, Message, OutMessage, Command> = UpdateHandlers<
  Model,
  Message,
  OutMessage,
  Command
> & {
  readonly [OnSlotTypeId]?: (model: Model) => Result<Model, OutMessage, Command>
}

type OutMessageHandler<
  ParentModel,
  OutMessage,
  Tag,
  Instance,
  ParentOutMessage,
  ParentCommand,
> = (
  model: ParentModel,
  outMessage: Extract<OutMessage, Readonly<{ _tag: Tag }>>,
  instance: Instance,
) => Result<ParentModel, ParentOutMessage, ParentCommand>

/** OutMessage handlers keyed by OutMessage tag. Each receives the parent
 *  Model, the OutMessage, and the child instance that reported it. */
export type OutMessageHandlers<
  ParentModel,
  OutMessage,
  Instance,
  ParentOutMessage = never,
  ParentCommand = never,
> = [OutMessage] extends [never]
  ? {}
  : [OutMessage] extends [Tagged]
    ? {
        readonly [Tag in OutMessage['_tag']]?: OutMessageHandler<
          ParentModel,
          OutMessage,
          Tag,
          Instance,
          ParentOutMessage,
          ParentCommand
        >
      }
    : never

/** OutMessage handlers with one handler for every OutMessage tag. */
export type AllOutMessageHandlers<
  ParentModel,
  OutMessage,
  Instance,
  ParentOutMessage = never,
  ParentCommand = never,
> = [OutMessage] extends [never]
  ? {}
  : [OutMessage] extends [Tagged]
    ? {
        readonly [Tag in OutMessage['_tag']]: OutMessageHandler<
          ParentModel,
          OutMessage,
          Tag,
          Instance,
          ParentOutMessage,
          ParentCommand
        >
      }
    : never

// IMPLEMENTATION

type InitSlot<Model, Args> = [Model] extends [undefined]
  ? {
      readonly init?: (args: Args, context: InitContext) => undefined
    }
  : { readonly init: (args: Args, context: InitContext) => Model }

type UpdateSlot<Model, Message, OutMessage, Command> = [Message] extends [never]
  ? { readonly update?: UpdateRecord<Model, Message, OutMessage, Command> }
  : { readonly update: UpdateRecord<Model, Message, OutMessage, Command> }

type HandlersSlot<Key extends string, Definitions> = [Definitions] extends [
  never,
]
  ? { readonly [K in Key]?: undefined }
  : { readonly [K in Key]: HandlerRecord<Definitions> }

/** A Stream that runs while its instance is in the Model and its
 *  dependencies stay the same. The runtime recomputes the dependencies from
 *  the instance's Model after every update and restarts the Stream when they
 *  change. */
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

/** What a Block's Layer constructor returns. It is the Block's module,
 *  shared by every instance: `init` turns an instance's args into its
 *  starting Model, `start` lists the Commands to run when an instance
 *  appears in the Model, from its Model and args, `update` handles its Messages and its children's
 *  OutMessages, `commands` and `mounts` implement its Commands and Mounts,
 *  `subscriptions` are Streams that depend on its Model, and `view` renders
 *  it. */
export type Implementation<
  C extends Contract,
  Args = void,
  ViewInput = void,
> = InitSlot<ModelOf<C>, Args> &
  UpdateSlot<
    ModelOf<C>,
    MessageOf<C>,
    OutMessageOf<C>,
    CommandOf<DefinitionsOf<C, 'Command'>, MessageOf<C>>
  > &
  HandlersSlot<'commands', DefinitionsOf<C, 'Command'>> &
  HandlersSlot<'mounts', DefinitionsOf<C, 'Mount'>> &
  Readonly<{
    start?: (
      model: ModelOf<C>,
      args: Args,
    ) => ReadonlyArray<CommandOf<DefinitionsOf<C, 'Command'>, MessageOf<C>>>
    view?: ViewFunction<
      ModelOf<C>,
      MessageOf<C>,
      ViewInput,
      MountRequirementsOf<DefinitionsOf<C, 'Mount'>>
    >
    subscriptions?: Readonly<
      Record<string, Subscription<ModelOf<C>, MessageOf<C>>>
    >
  }>

// INSTANCE

/** The members of a Block instance. Create one with `new Block(id, args)` and
 *  put it in a parent's Model. The value holds the instance's id and its
 *  current Model; what runs for it, its Subscriptions and Commands, runs
 *  while a Model holds it. */
export interface InstanceMembers<
  C extends Contract,
  Args = void,
  ViewInput = void,
> {
  /** The instance id, unique among its parent's children. */
  readonly id: string
  /** The instance's current Model. */
  readonly model: ModelOf<C>
  /** Renders the instance from its parent's view. Its Messages are routed
   *  back to it. Functions in the input run as the parent, so the Messages
   *  they create are the parent's. */
  view(...input: [ViewInput] extends [void] ? [] : [input: ViewInput]): Html
  /** Creates a Message for this instance. Return it under `messages` from a
   *  parent update handler. */
  send(message: MessageOf<C>): Send
  /** @internal Carries the constructor args type. */
  readonly '~args'?: (args: Args) => Args
}

type AnyInstance = Readonly<{ send: (message: never) => Send }>

/** The Block instances a value holds, without descending into the
 *  instances' own Models. */
type InstancesIn<
  T,
  Depth extends ReadonlyArray<unknown> = [],
> = Depth['length'] extends 6
  ? never
  : T extends AnyInstance
    ? T
    : T extends ReadonlyArray<infer Item>
      ? InstancesIn<Item, [...Depth, unknown]>
      : T extends Option.Option<infer Value>
        ? InstancesIn<Value, [...Depth, unknown]>
        : T extends Readonly<Record<string, unknown>>
          ? {
              [K in keyof T]-?: InstancesIn<
                Exclude<T[K], undefined>,
                [...Depth, unknown]
              >
            }[keyof T]
          : never

/** The child Blocks a Block's Layer requires: the Blocks its Model holds,
 *  other than itself. */
export type ChildBlocksOf<Self, Model> = Exclude<InstancesIn<Model>, Self>

type ConstructorArgs<Args> = [Args] extends [void] ? [] : [args: Args]

/** A Block class without its `layer` static: the constructor, Schema, contract
 *  members, and parent-facing helpers. Block factories whose implementation
 *  static takes a different input, such as a Query's fetch function, build
 *  their class type from this. */
export type BlockClassDeclaration<
  Self,
  Id extends string,
  Args,
  ViewInput,
  C extends Contract,
> = (new (
  id: string,
  ...args: ConstructorArgs<Args>
) => InstanceMembers<C, Args, ViewInput>) &
  Omit<Schema.declare<Self>, 'make'> &
  Effect.Effect<Implementation<C, Args, ViewInput>, never, Self> &
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
    /** Handles the OutMessages of every instance of this Block that the
     *  parent's Model holds. Spread the result into the parent's update
     *  record. An OutMessage without a handler is dropped. */
    on: <ParentModel, ParentOutMessage = never, ParentCommand = never>(
      handlers: OutMessageHandlers<
        NoInfer<ParentModel>,
        OutMessageOf<C>,
        Self,
        NoInfer<ParentOutMessage>,
        NoInfer<ParentCommand>
      >,
    ) => OnEntry<ParentModel, ParentOutMessage, ParentCommand>
    /** Like `on`, but it requires a handler for every OutMessage tag, so
     *  adding an OutMessage to this Block is a type error in every parent
     *  until the parent handles it. */
    onAll: <ParentModel, ParentOutMessage = never, ParentCommand = never>(
      handlers: AllOutMessageHandlers<
        NoInfer<ParentModel>,
        OutMessageOf<C>,
        Self,
        NoInfer<ParentOutMessage>,
        NoInfer<ParentCommand>
      >,
    ) => OnEntry<ParentModel, ParentOutMessage, ParentCommand>
    /** Gates the Messages every instance of this Block in the parent's
     *  Model receives. A Message from an instance's view, Commands, or
     *  Subscriptions reaches its update only when the predicate returns true
     *  for the parent's current Model and the Message; otherwise it is
     *  dropped. Messages the parent sends with `send` are not gated. */
    when: <ParentModel>(
      predicate: (
        model: NoInfer<ParentModel>,
        message: MessageOf<C>,
      ) => boolean,
    ) => OnEntry<ParentModel>
    /** Types a Block's `init` written outside its implementation. Returns
     *  the function unchanged. */
    init: (
      init: (args: Args, context: InitContext) => ModelOf<C>,
    ) => (args: Args, context: InitContext) => ModelOf<C>
    /** Types a Block's update record written outside its implementation,
     *  including the `Child.on` entries spread into it. Returns the record
     *  unchanged. */
    update: (
      update: UpdateRecord<
        ModelOf<C>,
        MessageOf<C>,
        OutMessageOf<C>,
        CommandOf<DefinitionsOf<C, 'Command'>, MessageOf<C>>
      >,
    ) => UpdateRecord<
      ModelOf<C>,
      MessageOf<C>,
      OutMessageOf<C>,
      CommandOf<DefinitionsOf<C, 'Command'>, MessageOf<C>>
    >
    /** Types a reusable transition written outside the implementation: it
     *  takes the Model and any extra arguments and returns an update result.
     *  Returns the function unchanged. */
    step: <Rest extends ReadonlyArray<unknown> = []>(
      step: (
        model: ModelOf<C>,
        ...rest: Rest
      ) => Result<
        ModelOf<C>,
        OutMessageOf<C>,
        CommandOf<DefinitionsOf<C, 'Command'>, MessageOf<C>>
      >,
    ) => (
      model: ModelOf<C>,
      ...rest: Rest
    ) => Result<
      ModelOf<C>,
      OutMessageOf<C>,
      CommandOf<DefinitionsOf<C, 'Command'>, MessageOf<C>>
    >
    /** Types a Block's view written outside its implementation. Returns
     *  the function unchanged. */
    view: (
      view: ViewFunction<
        ModelOf<C>,
        MessageOf<C>,
        ViewInput,
        MountRequirementsOf<DefinitionsOf<C, 'Mount'>>
      >,
    ) => ViewFunction<
      ModelOf<C>,
      MessageOf<C>,
      ViewInput,
      MountRequirementsOf<DefinitionsOf<C, 'Mount'>>
    >
    /** Types a Block's Command handlers written outside its implementation.
     *  Returns the record unchanged. */
    commands: (
      commands: HandlerRecord<DefinitionsOf<C, 'Command'>>,
    ) => HandlerRecord<DefinitionsOf<C, 'Command'>>
    /** Types a Block's Mount handlers written outside its implementation.
     *  Returns the record unchanged. */
    mounts: (
      mounts: HandlerRecord<DefinitionsOf<C, 'Mount'>>,
    ) => HandlerRecord<DefinitionsOf<C, 'Mount'>>
    /** Types a Block's Subscriptions written outside its implementation.
     *  Returns the record unchanged. */
    subscriptions: (
      subscriptions: Readonly<
        Record<string, Subscription<ModelOf<C>, MessageOf<C>>>
      >,
    ) => Readonly<Record<string, Subscription<ModelOf<C>, MessageOf<C>>>>
  }>

/** A Block class. Declare one with
 *  `class Counter extends Block<Counter, Args>()('Counter', contract) {}`. */
export type BlockClass<
  Self,
  Id extends string,
  Args,
  ViewInput,
  C extends Contract,
> = BlockClassDeclaration<Self, Id, Args, ViewInput, C> &
  Readonly<{
    /** Implements the Block with its module, which every instance shares.
     *  Pass a function returning the module when the Block uses no
     *  services, or an Effect that yields the services its handlers use and
     *  returns the module. Either runs once, when the program's Layer is
     *  built.
     *  The returned Layer requires the Layers of the Blocks its Model
     *  holds. */
    toLayer: <E = never, R = never>(
      module:
        | (() => Implementation<C, Args, ViewInput>)
        | Effect.Effect<Implementation<C, Args, ViewInput>, E, R>,
    ) => Layer.Layer<
      Self,
      E,
      Exclude<R, Scope.Scope> | ChildBlocksOf<Self, ModelOf<C>>
    >
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

const copyMembers = (source: object, target: object): void => {
  let current: object | null = source
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

class ImplementationEffect extends Effectable.Class<unknown, never, unknown> {
  readonly effect: Effect.Effect<unknown, never, unknown>

  constructor(effect: Effect.Effect<unknown, never, unknown>) {
    super()
    this.effect = effect
  }

  asEffect(): Effect.Effect<unknown, never, unknown> {
    return this.effect
  }
}

const makeImplementationEffect = (
  effect: Effect.Effect<unknown, never, unknown>,
): object => new ImplementationEffect(effect)

const identity = <A>(value: A): A => value

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

const onEntry = (block: RuntimeBlock, handlers: unknown): unknown => ({
  [Symbol('foldkit/Block/on')]: {
    [OnEntryTypeId]: true,
    block,
    handlers,
  },
})

const gateEntry = (block: RuntimeBlock, predicate: unknown): unknown => ({
  [Symbol('foldkit/Block/when')]: {
    [GateEntryTypeId]: true,
    block,
    predicate,
  },
})

/* eslint-disable @typescript-eslint/consistent-type-assertions */
const asDefinitions = (
  definitions: ReadonlyArray<AnyDefinition> | undefined,
): ReadonlyArray<AnyHandlerDefinition> =>
  (definitions ?? []) as unknown as ReadonlyArray<AnyHandlerDefinition>

const asRuntimeInstance = (instance: object): RuntimeInstance =>
  instance as RuntimeInstance
/* eslint-enable @typescript-eslint/consistent-type-assertions */

/**
 * Declares a Block class. The class is the Block's contract: its Model,
 * Message, OutMessage, Command, and Mount lists. Implement it with `layer`,
 * create instances with `new` anywhere, and connect them by putting them in
 * a parent's Model.
 *
 * The type parameters are the class itself, its instances' args, and the
 * input its view takes from a parent.
 *
 * ```ts
 * export class Counter extends Block<Counter, { readonly max: number }>()('Counter', {
 *   Model: Schema.Struct({ count: Schema.Number, max: Schema.Number }),
 *   Message: defineMessageUnion({ ClickedIncrement: {} }),
 * }) {}
 * ```
 */
/** Declares a Block class from its id and contract, and optionally its
 *  implementation. A class declared with an implementation is also its own
 *  Layer: provide it with `Layer.provide(X)`. */
/** The implementation a Block declaration may take as its third argument:
 *  a function returning the module, or an Effect that yields services and
 *  returns the module. */
export type InlineImplementation<C extends Contract, Args, ViewInput, E, R> =
  | (() => Implementation<C, Args, ViewInput>)
  | Effect.Effect<Implementation<C, Args, ViewInput>, E, R>

/** Declares a Block class from its id and contract, and optionally its
 *  implementation. A class declared with an implementation is also its own
 *  Layer: provide it with `Layer.provide(X)`. */
export interface DeclareBlock<Self, Args, ViewInput> {
  <const Id extends string, const C extends Contract, E = never, R = never>(
    id: Id,
    contract: C,
    implementation: InlineImplementation<C, Args, ViewInput, E, R>,
  ): BlockClass<Self, Id, Args, ViewInput, C> &
    Layer.Layer<Self, E, Exclude<R, Scope.Scope> | InstancesIn<ModelOf<C>>>
  <const Id extends string, const C extends Contract = {}>(
    id: Id,
    contract?: C,
  ): BlockClass<Self, Id, Args, ViewInput, C>
}

export const Block = <Self, Args = void, ViewInput = void>(): DeclareBlock<
  Self,
  Args,
  ViewInput
> =>
  // oxlint-disable-next-line typescript/consistent-type-assertions
  ((
    id: string,
    contract?: Contract,
    maybeImplementation?:
      | (() => RuntimeImplementation)
      | Effect.Effect<RuntimeImplementation, unknown, unknown>,
  ): unknown => {
    blockCount += 1
    const service = Context.Service<unknown, RuntimeModule>(
      `foldkit/Block/${id}#${blockCount}`,
    )

    const runtimeBlock: RuntimeBlock = {
      id,
      prototype: {},
      Command: asDefinitions(contract?.Command),
      Mount: asDefinitions(contract?.Mount),
      service,
    }

    class Instance {
      declare readonly id: string
      declare readonly model: unknown

      constructor(instanceId: string, args?: unknown) {
        defineInstanceFields(this, instanceId, args, Option.none())
      }

      view(input?: unknown): unknown {
        return renderInstance(asRuntimeInstance(this), input)
      }

      send(message: unknown): unknown {
        return { [SendTypeId]: true, childId: this.id, message }
      }

      toJSON(): unknown {
        return { _tag: id, id: this.id, model: this.model }
      }
    }

    Object.defineProperty(Instance.prototype, InstanceTypeId, { value: true })
    Object.defineProperty(Instance.prototype, BlockTypeId, {
      value: runtimeBlock,
    })
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
    copyMembers(schema, Instance)

    const toLayer = (
      input:
        | (() => RuntimeImplementation)
        | Effect.Effect<RuntimeImplementation, unknown, unknown>,
    ) =>
      Layer.effect(
        service,
        Effect.flatMap(
          Effect.isEffect(input) ? input : Effect.sync(input),
          impl => makeModule(runtimeBlock, impl),
        ),
      )

    const statics = {
      id,
      Model: contract?.Model,
      Message: contract?.Message,
      OutMessage: contract?.OutMessage,
      Command: contract?.Command,
      Mount: contract?.Mount,
      toLayer,
      init: identity,
      update: identity,
      step: identity,
      view: identity,
      commands: identity,
      mounts: identity,
      subscriptions: identity,
      on: (handlers: unknown) => onEntry(runtimeBlock, handlers),
      onAll: (handlers: unknown) => onEntry(runtimeBlock, handlers),
      when: (predicate: unknown) => gateEntry(runtimeBlock, predicate),
    }

    for (const [key, value] of Object.entries(statics)) {
      Object.defineProperty(Instance, key, {
        value,
        enumerable: true,
        configurable: true,
      })
    }

    // yielding the class returns its implementation, like a Context tag
    copyMembers(
      makeImplementationEffect(Effect.map(service, ({ impl }) => impl)),
      Instance,
    )

    if (maybeImplementation !== undefined) {
      copyMembers(toLayer(maybeImplementation), Instance)
    }

    return Instance
  }) as never

/** Addresses a Message to a Block instance by its path from the root. Use it
 *  in tests to deliver a child's Message through its ancestors. */
export const deliver = <B extends Readonly<{ Message: unknown }>>(
  _block: B,
  path: string | ReadonlyArray<string>,
  message: B['Message'] extends Schema.Top ? B['Message']['Type'] : never,
): BlockMessage =>
  blockMessage(Predicate.isString(path) ? [path] : path, message)
