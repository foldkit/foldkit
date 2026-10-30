import {
  Array,
  Cause,
  Context,
  Data,
  Deferred,
  Effect,
  Equal,
  Exit,
  Fiber,
  Layer,
  Option,
  Predicate,
  Queue,
  Scope,
  Stream,
} from 'effect'

import { mapEffect, mapMessage } from '../command/index.js'
import {
  __CurrentRegistry as CurrentInterruptRegistry,
  __makeRegistry as makeInterruptRegistry,
} from '../command/interruptible/interruptible.js'
import { __htmlBuilder as htmlBuilder } from '../html/index.js'
import type { DispatchSync, Frame } from '../html/runtimeSingleton.js'
import {
  clearRuntime,
  getCurrentFrame,
  pushFrame,
  requireDispatch,
} from '../html/runtimeSingleton.js'

/** The position of a Block instance in the graph, from the root. */
export type Path = ReadonlyArray<string>

/** @internal Marks every Block instance, connected or not. */
export const InstanceTypeId = Symbol.for('foldkit/Block/Instance')

/** @internal Holds the live node of a connected instance. */
export const NodeTypeId = Symbol.for('foldkit/Block/Node')

/** @internal Holds the construction recipe of an instance that is not yet
 *  connected. */
export const PendingTypeId = Symbol.for('foldkit/Block/Pending')

/** @internal Holds the preserved data of an instance decoded from a
 *  development reload, before it is restored onto a live graph. */
export const PreservedTypeId = Symbol.for('foldkit/Block/Preserved')

/** @internal Marks an OutMessage handler entry spread into an update record. */
export const OnEntryTypeId = Symbol.for('foldkit/Block/OnEntry')

/** @internal Marks a Message sent from a parent to a child instance. */
export const SendTypeId = Symbol.for('foldkit/Block/Send')

/** A child Block's Message addressed to its instance. The runtime routes it to
 *  the instance at `path` and applies the result to every ancestor. */
export type BlockMessage = Readonly<{
  _tag: 'BlockMessage'
  path: Path
  message: unknown
}>

/** Addresses a Message to the Block instance at `path`. */
export const blockMessage = (path: Path, message: unknown): BlockMessage => ({
  _tag: 'BlockMessage',
  path,
  message,
})

/** Returns whether a value is a {@link BlockMessage}. */
export const isBlockMessage = (value: unknown): value is BlockMessage =>
  Predicate.isTagged(value, 'BlockMessage') &&
  Predicate.hasProperty(value, 'path') &&
  Predicate.hasProperty(value, 'message')

/** Fails `use` when the instance is not in its parent's Model. */
export class NotConnected extends Data.TaggedError('NotConnected')<{
  readonly path: Path
}> {}

/** @internal A Command invocation as the engine sees it. */
export type AnyCommand = Readonly<{
  name: string
  args?: Record<string, unknown>
  effect: Effect.Effect<unknown, unknown, unknown>
}>

/** @internal A Command or Mount definition as the engine sees it. */
export type AnyHandlerDefinition = Readonly<{
  name: string
  toLayer: (
    build: Effect.Effect<(input: unknown) => unknown>,
  ) => Layer.Layer<never, never, never>
}>

/** @internal The value a Block constructor returns, as the engine sees it. */
export type RuntimeImplementation = Readonly<{
  model?: unknown
  update?: Readonly<Record<PropertyKey, unknown>>
  view?: (model: unknown, h: unknown, input: unknown) => unknown
  commands?: Readonly<Record<string, (input: unknown) => unknown>>
  mounts?: Readonly<Record<string, (input: unknown) => unknown>>
  stream?: Stream.Stream<unknown>
  subscriptions?: Readonly<Record<string, RuntimeSubscription>>
  start?: ReadonlyArray<AnyCommand>
  expose?: unknown
}>

/** @internal A Model-dependent Stream as the engine sees it. */
export type RuntimeSubscription = Readonly<{
  dependencies: (model: unknown) => unknown
  stream: (
    dependencies: unknown,
    readDependencies: () => unknown,
  ) => Stream.Stream<unknown>
  keepAliveEquivalence?: (previous: unknown, next: unknown) => boolean
}>

/** @internal A Block constructor registered by `make`. */
export type RuntimeConstructor = (
  id: string,
  args: unknown,
) => Effect.Effect<RuntimeImplementation, unknown, unknown>

/** @internal The static side of a Block class as the engine sees it. */
export type RuntimeBlock = Readonly<{
  id: string
  prototype: object
  Command: ReadonlyArray<AnyHandlerDefinition>
  Mount: ReadonlyArray<AnyHandlerDefinition>
  service: Context.Key<unknown, RuntimeConstructor>
}>

/** @internal Shared state for one running graph: a program or a test. */
export type Graph = {
  readonly isSimulation: boolean
  readonly nodes: Map<string, Node>
  readonly pending: Array<unknown>
  readonly started: Array<AnyCommand>
  readonly recipes: Map<string, Pending>
  readonly collections: Map<string, Pending>
  readonly messageOrigins: WeakMap<BlockMessage, Node>
  emit: ((message: unknown) => void) | undefined
  rootDispatch: DispatchSync | undefined
  runtimeContext: Deferred.Deferred<Context.Context<never>>
}

/** @internal The live part of a connected instance. Kept off the Model so the
 *  Model stays plain data. */
export type Node = Readonly<{
  graph: Graph
  block: RuntimeBlock
  path: Path
  impl: RuntimeImplementation
  scope: Scope.Closeable
  handlerContext: Context.Context<never>
  onEntries: ReadonlyArray<OnEntry>
  running: Map<string, { dependencies: unknown; fiber: Fiber.Fiber<void> }>
  commandFibers: CommandFibers
  viewState: ViewState
}>

/** @internal The fibers of an instance's in-flight Commands. Closing the
 *  instance's scope interrupts them, so a removed instance's Command never
 *  delivers a result to a later instance at the same path. */
type CommandFibers = {
  isClosed: boolean
  readonly fibers: Set<Fiber.Fiber<unknown, unknown>>
}

/** @internal The frames of an instance's latest render and the wrappers
 *  that run view input functions in them. Wrappers are cached per function,
 *  so a function the parent passes on every render reaches the child as the
 *  same function. */
type ViewState = {
  parentFrame: Frame | undefined
  childFrame: Frame | undefined
  readonly asParent: WeakMap<Function, Function>
  readonly asChild: WeakMap<Function, Function>
}

/** @internal Who an OutMessage handler entry listens to. A collection target
 *  matches every instance created by one `each` factory. */
export type OnTarget = Readonly<
  { kind: 'Instance'; path: Path } | { kind: 'Collection'; path: Path }
>

/** @internal An OutMessage handler entry. */
export type OnEntry = Readonly<{
  [OnEntryTypeId]: true
  target: OnTarget
  handlers: Readonly<
    Record<
      string,
      (model: unknown, outMessage: unknown, instance: unknown) => unknown
    >
  >
}>

/** @internal A Message a parent sends to a child instance from update. */
export type Send = Readonly<{
  [SendTypeId]: true
  target: Path
  message: unknown
}>

/** @internal The recipe for an instance that is constructed when it first
 *  appears in a Model. */
export type Pending = Readonly<{
  graph: Graph
  block: RuntimeBlock
  path: Path
  args: unknown
  context: Context.Context<never>
}>

/** @internal An instance object as the engine sees it. */
export type RuntimeInstance = Readonly<{
  id: string
  model: unknown
  [InstanceTypeId]: true
  [NodeTypeId]?: Node
  [PendingTypeId]?: Pending
  [PreservedTypeId]?: Preserved
}>

/** @internal The data of an instance preserved across a development
 *  reload: its path and its Model, whose child instances are preserved too. */
export type Preserved = Readonly<{
  path: Path
  model: unknown
}>

/** @internal Provides the graph and the current instance path to a Block
 *  constructor, so the child instances it creates know where they live. */
export class BlockParent extends Context.Service<
  BlockParent,
  Readonly<{ graph: Graph; path: Path }>
>()('foldkit/Block/BlockParent') {}

const noCommands: ReadonlyArray<AnyCommand> = []

type ApplyResult = Readonly<{
  instance: RuntimeInstance
  commands: ReadonlyArray<AnyCommand>
  outMessage: unknown
}>

type UpdateResult = Readonly<{
  model?: unknown
  commands?: ReadonlyArray<AnyCommand>
  outMessage?: unknown
  messages?: ReadonlyArray<Send>
}>

// GRAPH

/** @internal Creates the shared state for a running graph. */
export const makeGraph = (
  options: Readonly<{ isSimulation: boolean }>,
): Graph => ({
  isSimulation: options.isSimulation,
  nodes: new Map(),
  pending: [],
  started: [],
  recipes: new Map(),
  collections: new Map(),
  messageOrigins: new WeakMap(),
  emit: undefined,
  rootDispatch: undefined,
  runtimeContext: Deferred.makeUnsafe(),
})

/** @internal Closes every instance in a graph and forgets its state, so the
 *  program that owns it can start again from nothing. */
export const disposeGraph = (graph: Graph): Effect.Effect<void> =>
  Effect.suspend(() => {
    const scopes = Array.map(Array.fromIterable(graph.nodes.values()), node =>
      Scope.close(node.scope, Exit.void),
    )
    graph.nodes.clear()
    graph.recipes.clear()
    graph.collections.clear()
    graph.pending.length = 0
    graph.started.length = 0
    graph.emit = undefined
    graph.rootDispatch = undefined
    graph.runtimeContext = Deferred.makeUnsafe()
    return Effect.all(scopes, { discard: true })
  })

/** @internal A Stream of the Messages that instance Streams emit. The runtime
 *  consumes it as one Subscription, and the context it runs in, which carries
 *  the program's Ports, becomes the context of every instance Stream. */
export const graphMessages = (graph: Graph): Stream.Stream<unknown> =>
  Stream.callback<unknown>(queue =>
    Effect.acquireRelease(
      Effect.flatMap(Effect.context<never>(), context =>
        Effect.sync(() => {
          Deferred.doneUnsafe(graph.runtimeContext, Effect.succeed(context))
          graph.emit = message => {
            Queue.offerUnsafe(queue, message)
          }
          for (const message of graph.pending.splice(0)) {
            Queue.offerUnsafe(queue, message)
          }
        }),
      ),
      () =>
        Effect.sync(() => {
          graph.emit = undefined
        }),
    ),
  )

const emit = (graph: Graph, message: unknown): void => {
  if (graph.emit === undefined) {
    graph.pending.push(message)
  } else {
    graph.emit(message)
  }
}

const pathKey = (path: Path): string => JSON.stringify(path)

const instanceMessage = (node: Node, message: unknown): BlockMessage => {
  const wrapped = blockMessage(node.path, message)
  node.graph.messageOrigins.set(wrapped, node)
  return wrapped
}

const runInstanceStream = (
  node: Node,
  stream: Stream.Stream<unknown>,
): Effect.Effect<void> =>
  Effect.flatMap(Deferred.await(node.graph.runtimeContext), runtimeContext =>
    Stream.runForEach(stream, message =>
      Effect.sync(() => emit(node.graph, instanceMessage(node, message))),
    ).pipe(
      Effect.updateContext((context: Context.Context<never>) =>
        Context.merge(runtimeContext, context),
      ),
    ),
  )

/** @internal Returns whether a value is a Block instance. */
export const isInstance = (value: unknown): value is RuntimeInstance =>
  Predicate.hasProperty(value, InstanceTypeId)

/** @internal Returns the live node of a connected instance. */
export const nodeOf = (instance: RuntimeInstance): Node => {
  const node = instance[NodeTypeId]
  if (node === undefined) {
    throw new Error(
      `[foldkit] Block instance "${instance.id}" is not connected. An instance renders and receives Messages only while it is in its parent's Model.`,
    )
  }
  return node
}

/** @internal Returns the path of an instance, connected or not. */
export const instancePath = (instance: RuntimeInstance): Path => {
  const pending = instance[PendingTypeId]
  return pending === undefined ? nodeOf(instance).path : pending.path
}

/** @internal Returns the graph of an instance, connected or not. */
export const instanceGraph = (instance: RuntimeInstance): Graph => {
  const pending = instance[PendingTypeId]
  return pending === undefined ? nodeOf(instance).graph : pending.graph
}

const isPathPrefix = (prefix: Path, path: Path): boolean =>
  prefix.length <= path.length &&
  Array.every(prefix, (segment, index) => path[index] === segment)

const isPathEqual = (left: Path, right: Path): boolean =>
  left.length === right.length && isPathPrefix(left, right)

const defineHidden = (
  target: object,
  key: PropertyKey,
  value: unknown,
): void => {
  Object.defineProperty(target, key, {
    value,
    enumerable: false,
    writable: false,
    configurable: false,
  })
}

const isRuntimeInstance = (value: unknown): value is RuntimeInstance =>
  isInstance(value)

const makeInstanceObject = (
  prototype: object,
  id: string,
  args: unknown,
  fields: ReadonlyArray<readonly [PropertyKey, unknown, boolean]>,
): RuntimeInstance => {
  const instance: object = Object.create(prototype)
  Object.defineProperty(instance, 'id', { value: id, enumerable: true })
  defineHidden(instance, 'args', args)
  for (const [key, value, isEnumerable] of fields) {
    Object.defineProperty(instance, key, { value, enumerable: isEnumerable })
  }
  if (!isRuntimeInstance(instance)) {
    throw new Error('[foldkit] Block prototype is missing its brand.')
  }
  return instance
}

const bind = (
  node: Node,
  id: string,
  args: unknown,
  model: unknown,
): RuntimeInstance =>
  makeInstanceObject(node.block.prototype, id, args, [
    ['model', model, true],
    [NodeTypeId, node, false],
  ])

const withModel = (
  instance: RuntimeInstance,
  model: unknown,
): RuntimeInstance =>
  model === instance.model
    ? instance
    : bind(nodeOf(instance), instance.id, Reflect.get(instance, 'args'), model)

/** @internal Creates an instance that is constructed the first time it
 *  appears in a Model. */
export const makePending = (pending: Pending, id: string): RuntimeInstance => {
  const { graph, path } = pending
  if (!graph.collections.has(pathKey(Array.dropRight(path, 1)))) {
    graph.recipes.set(pathKey(path), pending)
  }
  return makeInstanceObject(pending.block.prototype, id, pending.args, [
    [PendingTypeId, pending, false],
  ])
}

/** @internal Records the recipe of an `each` factory, whose `path` is the
 *  collection path, so a restore can construct any of its keyed instances. */
export const registerCollection = (collection: Pending): void => {
  collection.graph.collections.set(pathKey(collection.path), collection)
}

// MODEL TRAVERSAL

const isTraversable = (value: unknown): value is object => {
  if (!Predicate.isObjectOrArray(value) || isInstance(value)) {
    return false
  }

  if (globalThis.Array.isArray(value)) {
    return true
  }

  const prototype = Object.getPrototypeOf(value)
  return (
    prototype === Object.prototype ||
    prototype === null ||
    Option.isOption(value) ||
    Predicate.hasProperty(value, '_tag')
  )
}

/** Maps every instance reachable in a value without descending into
 *  instances, rebuilding only the containers that changed. */
const mapInstances = (
  value: unknown,
  f: (instance: RuntimeInstance) => unknown,
): unknown => {
  if (isInstance(value)) {
    return f(value)
  }

  if (!isTraversable(value)) {
    return value
  }

  if (globalThis.Array.isArray(value)) {
    let isChanged = false
    const next = value.map(item => {
      const mapped = mapInstances(item, f)
      if (mapped !== item) {
        isChanged = true
      }
      return mapped
    })
    return isChanged ? next : value
  }

  if (Option.isOption(value)) {
    if (Option.isNone(value)) {
      return value
    }
    const mapped = mapInstances(value.value, f)
    return mapped === value.value ? value : Option.some(mapped)
  }

  let maybeNext: Record<PropertyKey, unknown> | undefined
  for (const key of Object.keys(value)) {
    const current = Reflect.get(value, key)
    const mapped = mapInstances(current, f)
    if (mapped !== current) {
      const next: Record<PropertyKey, unknown> =
        maybeNext ??
        Object.assign(Object.create(Object.getPrototypeOf(value)), value)
      next[key] = mapped
      maybeNext = next
    }
  }
  return maybeNext ?? value
}

/** @internal Collects the instances directly held by a value, without
 *  descending into their own Models. */
export const directInstances = (
  value: unknown,
): ReadonlyArray<RuntimeInstance> => {
  const instances: Array<RuntimeInstance> = []
  mapInstances(value, instance => {
    instances.push(instance)
    return instance
  })
  return instances
}

/** Collects the connected instances of one graph. A Model can hold another
 *  program's instances as plain values, such as a devtools Model holding the
 *  inspected application's Model; those belong to their own graph. */
const collectLive = (
  graph: Graph,
  instance: RuntimeInstance,
  live: Map<string, RuntimeInstance>,
): void => {
  const node = instance[NodeTypeId]
  if (node === undefined || node.graph !== graph) {
    return
  }
  live.set(pathKey(node.path), instance)
  for (const child of directInstances(instance.model)) {
    collectLive(graph, child, live)
  }
}

const containsInstances = (value: unknown): boolean =>
  Array.isReadonlyArrayNonEmpty(directInstances(value))

/** @internal Replaces every instance in a Model tree with its own resolved
 *  Model, producing plain data for tests and devtools. */
export const resolve = (value: unknown): unknown =>
  mapInstances(value, instance => resolve(instance.model))

/** @internal Applies resolved data onto a Model tree that holds instances.
 *  Where the template holds an instance, the data is that instance's Model. */
export const hydrate = (data: unknown, template: unknown): unknown => {
  if (data === template) {
    return template
  }

  if (!isInstance(template) && !containsInstances(template)) {
    return data
  }

  if (isInstance(template)) {
    return withModel(template, hydrate(data, template.model))
  }

  if (globalThis.Array.isArray(template) && globalThis.Array.isArray(data)) {
    const instanceCount = directInstances(template).length
    if (instanceCount > 0 && data.length !== template.length) {
      throw new Error(
        '[foldkit] A test Model changes the length of an array that holds Block instances. Add or remove instances with Messages instead of `given`.',
      )
    }
    return data.map((item, index) => hydrate(item, template[index]))
  }

  if (Option.isOption(template) && Option.isOption(data)) {
    if (Option.isSome(template) && Option.isSome(data)) {
      return Option.some(hydrate(data.value, template.value))
    }
    return data
  }

  if (
    isTraversable(template) &&
    isTraversable(data) &&
    !globalThis.Array.isArray(data) &&
    !Option.isOption(data)
  ) {
    const next: Record<PropertyKey, unknown> = Object.assign(
      Object.create(Object.getPrototypeOf(data)),
      data,
    )
    for (const key of Object.keys(data)) {
      next[key] = hydrate(Reflect.get(data, key), Reflect.get(template, key))
    }
    return next
  }

  return data
}

// CONSTRUCTION

const handlerLayers = (
  block: RuntimeBlock,
  kind: 'Command' | 'Mount',
  definitions: ReadonlyArray<AnyHandlerDefinition>,
  handlers: Readonly<Record<string, (input: unknown) => unknown>> | undefined,
): ReadonlyArray<Layer.Layer<never>> =>
  Array.map(definitions, definition => {
    const handler = handlers?.[definition.name]
    if (handler === undefined) {
      throw new Error(
        `[foldkit] Block "${block.id}" declares ${kind} "${definition.name}" but its constructor returned no handler for it under \`${kind === 'Command' ? 'commands' : 'mounts'}\`.`,
      )
    }
    return definition.toLayer(Effect.succeed(handler))
  })

const buildHandlerContext = (
  block: RuntimeBlock,
  impl: RuntimeImplementation,
  scope: Scope.Scope,
): Effect.Effect<Context.Context<never>> => {
  const layers = [
    ...handlerLayers(block, 'Command', block.Command, impl.commands),
    ...handlerLayers(block, 'Mount', block.Mount, impl.mounts),
  ]

  if (Array.isReadonlyArrayEmpty(layers)) {
    return Effect.succeed(Context.empty())
  }

  const merged = Array.reduce(
    layers,
    Layer.empty,
    (combined: Layer.Layer<never>, layer) => Layer.merge(combined, layer),
  )
  return Layer.buildWithScope(merged, scope)
}

const isOnEntry = (value: unknown): value is OnEntry =>
  Predicate.hasProperty(value, OnEntryTypeId)

const collectOnEntries = (
  update: RuntimeImplementation['update'],
): ReadonlyArray<OnEntry> =>
  update === undefined
    ? []
    : Array.filter(
        Array.map(Object.getOwnPropertySymbols(update), key => update[key]),
        isOnEntry,
      )

const construct = (
  graph: Graph,
  block: RuntimeBlock,
  path: Path,
  id: string,
  args: unknown,
): Effect.Effect<RuntimeInstance, unknown, unknown> =>
  Effect.gen(function* () {
    const constructor = yield* block.service
    const scope = yield* Scope.make()

    const closeScopeOnError = Effect.onError(() =>
      Scope.close(scope, Exit.void),
    )

    const impl = yield* constructor(id, args).pipe(
      Effect.provideService(BlockParent, { graph, path }),
      Scope.provide(scope),
      closeScopeOnError,
    )

    const handlerContext = Context.add(
      yield* buildHandlerContext(block, impl, scope).pipe(closeScopeOnError),
      CurrentInterruptRegistry,
      makeInterruptRegistry(),
    )

    const commandFibers: CommandFibers = { isClosed: false, fibers: new Set() }
    yield* Scope.addFinalizer(
      scope,
      Effect.sync(() => {
        commandFibers.isClosed = true
        for (const fiber of commandFibers.fibers) {
          Effect.runFork(Fiber.interrupt(fiber))
        }
      }),
    )

    const node: Node = {
      graph,
      block,
      path,
      impl,
      scope,
      handlerContext,
      onEntries: collectOnEntries(impl.update),
      running: new Map(),
      commandFibers,
      viewState: {
        parentFrame: undefined,
        childFrame: undefined,
        asParent: new WeakMap(),
        asChild: new WeakMap(),
      },
    }

    const maybeReplaced = graph.nodes.get(pathKey(path))
    if (maybeReplaced !== undefined) {
      Effect.runFork(Scope.close(maybeReplaced.scope, Exit.void))
    }
    graph.nodes.set(pathKey(path), node)

    const { stream } = impl
    if (stream !== undefined && !graph.isSimulation) {
      yield* runInstanceStream(node, stream).pipe(Effect.forkIn(scope))
    }

    graph.started.push(
      ...Array.map(impl.start ?? noCommands, command =>
        bindCommand(node, command),
      ),
    )

    return bind(node, id, args, materialize(impl.model))
  })

/** @internal Constructs an instance synchronously. Block constructors run
 *  inside `update` when an instance enters the Model, so they cannot wait on
 *  asynchronous work. */
export const constructSync = (
  graph: Graph,
  block: RuntimeBlock,
  path: Path,
  id: string,
  args: unknown,
  context: Context.Context<never>,
): RuntimeInstance => {
  const exit = Effect.runSyncExit(
    Effect.provideContext(
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      construct(graph, block, path, id, args) as Effect.Effect<
        RuntimeInstance,
        unknown
      >,
      context,
    ),
  )

  if (Exit.isSuccess(exit)) {
    return exit.value
  }

  throw new Error(
    `[foldkit] Block "${block.id}" instance "${id}" could not be constructed. Block constructors run synchronously when an instance enters the Model, so they cannot wait on asynchronous work; load data with a Command instead.\n\n${Cause.pretty(exit.cause)}`,
  )
}

/** @internal Constructs every instance in a value that is not yet
 *  connected. */
export const materialize = (value: unknown): unknown =>
  mapInstances(value, instance => {
    const pending = instance[PendingTypeId]
    return instance[NodeTypeId] === undefined && pending !== undefined
      ? constructSync(
          pending.graph,
          pending.block,
          pending.path,
          instance.id,
          pending.args,
          pending.context,
        )
      : instance
  })

// PRESERVATION

/** @internal Creates the decoded stand-in for an instance preserved across a
 *  development reload. It renders nothing and receives no Messages; `restore`
 *  replaces it with a live instance. */
export const makePreserved = (
  block: RuntimeBlock,
  id: string,
  preserved: Preserved,
): RuntimeInstance =>
  makeInstanceObject(block.prototype, id, undefined, [
    ['model', preserved.model, true],
    [PreservedTypeId, preserved, false],
  ])

const preservedOf = (instance: RuntimeInstance): Preserved => {
  const preserved = instance[PreservedTypeId]
  if (preserved === undefined) {
    throw new Error(
      `[foldkit] Block instance "${instance.id}" in a preserved Model was not decoded from preserved data.`,
    )
  }
  return preserved
}

const constructFromRecipe = (
  graph: Graph,
  stand: RuntimeInstance,
  path: Path,
): RuntimeInstance => {
  const collectionPath = Array.dropRight(path, 1)
  const recipe =
    graph.recipes.get(pathKey(path)) ??
    graph.collections.get(pathKey(collectionPath))

  if (
    recipe === undefined ||
    recipe.block.prototype !== Object.getPrototypeOf(stand)
  ) {
    throw new Error(
      `[foldkit] A preserved Model holds a Block instance at ${pathKey(path)} that the current Blocks do not create.`,
    )
  }

  return constructSync(
    graph,
    recipe.block,
    path,
    stand.id,
    recipe.args,
    recipe.context,
  )
}

const restoreInstance = (
  graph: Graph,
  live: RuntimeInstance,
  stand: RuntimeInstance,
): RuntimeInstance => {
  const preserved = preservedOf(stand)
  const liveChildren = new Map<string, RuntimeInstance>()
  for (const child of directInstances(live.model)) {
    const node = child[NodeTypeId]
    if (node !== undefined) {
      liveChildren.set(pathKey(node.path), child)
    }
  }

  const model = mapInstances(preserved.model, childStand => {
    const { path } = preservedOf(childStand)
    const childLive =
      liveChildren.get(pathKey(path)) ??
      constructFromRecipe(graph, childStand, path)
    return restoreInstance(graph, childLive, childStand)
  })

  return withModel(live, model)
}

/** @internal Restores a preserved Model tree onto a freshly constructed root.
 *  Instances the fresh root already holds are reused; the others are
 *  constructed from the recipes their parents registered. Startup Commands of
 *  every instance constructed here are dropped, because the preserved Model
 *  already reflects their results. Closes every constructed instance and
 *  rethrows when the preserved data does not fit the current Blocks. */
export const restore = (
  graph: Graph,
  root: RuntimeInstance,
  stand: RuntimeInstance,
): RuntimeInstance => {
  try {
    const restored = restoreInstance(graph, root, stand)
    takeStarted(graph)
    reconcile(graph, restored)
    return restored
  } catch (error) {
    takeStarted(graph)
    for (const node of graph.nodes.values()) {
      Effect.runFork(Scope.close(node.scope, Exit.void))
    }
    graph.nodes.clear()
    throw error
  }
}

// UPDATE

// NOTE: the fiber is interrupted from outside, never by `Effect.interrupt`.
// The runtime catches every failure cause of a Command to crash the app, and
// that includes a fiber interrupting itself. An outside interrupt ends the
// fiber before the runtime's handler runs.
const runWhileLive = <A, E, R>(
  { commandFibers }: Node,
  effect: Effect.Effect<A, E, R>,
): Effect.Effect<A, E, R> =>
  Effect.withFiber(fiber =>
    Effect.uninterruptibleMask(restore =>
      Effect.suspend(() => {
        if (commandFibers.isClosed) {
          Effect.runFork(Fiber.interrupt(fiber))
          return restore(Effect.never)
        }

        commandFibers.fibers.add(fiber)
        return restore(effect).pipe(
          Effect.ensuring(
            Effect.sync(() => commandFibers.fibers.delete(fiber)),
          ),
        )
      }),
    ),
  )

const bindCommand = (node: Node, command: AnyCommand): AnyCommand => {
  /* eslint-disable @typescript-eslint/consistent-type-assertions */
  const provided = mapEffect(command as never, effect =>
    runWhileLive(
      node,
      Effect.updateContext(effect as Effect.Effect<unknown>, context =>
        Context.merge(context, node.handlerContext),
      ),
    ),
  ) as AnyCommand

  return Array.isReadonlyArrayEmpty(node.path)
    ? provided
    : (mapMessage(provided as never, message =>
        instanceMessage(node, message),
      ) as AnyCommand)
  /* eslint-enable @typescript-eslint/consistent-type-assertions */
}

const isUpdateResult = (value: unknown): value is UpdateResult =>
  Predicate.isObject(value)

const applyResult = (
  instance: RuntimeInstance,
  result: unknown,
): ApplyResult => {
  if (!isUpdateResult(result)) {
    throw new Error(
      `[foldkit] A Block update handler returned ${globalThis.String(result)} instead of \`{ model }\`.`,
    )
  }

  const node = nodeOf(instance)
  let current = withModel(instance, materialize(result.model))
  let commands = [
    ...Array.map(result.commands ?? noCommands, command =>
      bindCommand(node, command),
    ),
    ...takeStarted(node.graph),
  ]
  let { outMessage } = result

  for (const send of result.messages ?? []) {
    const sent = deliver(current, send.target, send.message)
    current = sent.instance
    commands = [...commands, ...sent.commands]
    if (sent.outMessage !== undefined) {
      outMessage = sent.outMessage
    }
  }

  return { instance: current, commands, outMessage }
}

const tagOf = (message: unknown): string | undefined => {
  const tag: unknown = Predicate.hasProperty(message, '_tag')
    ? message._tag
    : undefined
  return Predicate.isString(tag) ? tag : undefined
}

const applyLocal = (
  instance: RuntimeInstance,
  message: unknown,
): ApplyResult => {
  const node = nodeOf(instance)
  const tag = tagOf(message)
  const handler =
    tag !== undefined && node.impl.update !== undefined
      ? node.impl.update[tag]
      : undefined

  if (!Predicate.isFunction(handler)) {
    throw new Error(
      `[foldkit] Block "${node.block.id}" has no update handler for Message "${globalThis.String(tag)}".`,
    )
  }

  return applyResult(instance, handler(instance.model, message))
}

const findOnHandler = (
  node: Node,
  child: RuntimeInstance,
  outMessage: unknown,
):
  | ((model: unknown, outMessage: unknown, instance: unknown) => unknown)
  | undefined => {
  const childPath = nodeOf(child).path
  const tag = tagOf(outMessage)
  if (tag === undefined) {
    return undefined
  }

  const isTarget = ({ target }: OnEntry): boolean =>
    target.kind === 'Instance'
      ? isPathEqual(target.path, childPath)
      : childPath.length === target.path.length + 1 &&
        isPathPrefix(target.path, childPath)

  const maybeEntry = Array.findFirst(
    node.onEntries,
    entry => isTarget(entry) && entry.handlers[tag] !== undefined,
  )

  return Option.match(maybeEntry, {
    onNone: () => undefined,
    onSome: ({ handlers }) => handlers[tag],
  })
}

const deliver = (
  instance: RuntimeInstance,
  path: Path,
  message: unknown,
): ApplyResult => {
  const node = nodeOf(instance)
  if (isPathEqual(node.path, path)) {
    return applyLocal(instance, message)
  }

  const maybeChild = Array.findFirst(
    directInstances(instance.model),
    child =>
      child[NodeTypeId]?.graph === node.graph &&
      isPathPrefix(nodeOf(child).path, path),
  )

  if (Option.isNone(maybeChild)) {
    return { instance, commands: noCommands, outMessage: undefined }
  }

  const child = maybeChild.value
  const delivered = deliver(child, path, message)
  const parent = withModel(
    instance,
    mapInstances(instance.model, candidate =>
      candidate === child ? delivered.instance : candidate,
    ),
  )

  const handler =
    delivered.outMessage === undefined
      ? undefined
      : findOnHandler(node, delivered.instance, delivered.outMessage)

  if (handler === undefined) {
    return {
      instance: parent,
      commands: delivered.commands,
      outMessage: undefined,
    }
  }

  const handled = applyResult(
    parent,
    handler(parent.model, delivered.outMessage, delivered.instance),
  )

  return {
    instance: handled.instance,
    commands: [...delivered.commands, ...handled.commands],
    outMessage: handled.outMessage,
  }
}

/** @internal Returns the startup Commands of instances constructed since the
 *  last call. */
export const takeStarted = (graph: Graph): ReadonlyArray<AnyCommand> =>
  graph.started.splice(0)

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  Predicate.isObject(value) &&
  (Object.getPrototypeOf(value) === Object.prototype ||
    Object.getPrototypeOf(value) === null)

const isSameDependencies = (left: unknown, right: unknown): boolean => {
  if (Equal.equals(left, right)) {
    return true
  }

  if (!isPlainRecord(left) || !isPlainRecord(right)) {
    return false
  }

  const keys = Object.keys(left)
  return (
    keys.length === Object.keys(right).length &&
    Array.every(keys, key => Equal.equals(left[key], right[key]))
  )
}

const syncSubscriptions = (
  graph: Graph,
  live: ReadonlyMap<string, RuntimeInstance>,
): void => {
  if (graph.isSimulation) {
    return
  }

  for (const [key, instance] of live) {
    const node = graph.nodes.get(key)
    const subscriptions = node?.impl.subscriptions
    if (node === undefined || subscriptions === undefined) {
      continue
    }

    for (const [name, subscription] of Object.entries(subscriptions)) {
      const dependencies = subscription.dependencies(instance.model)
      const maybeRunning = node.running.get(name)
      if (
        maybeRunning !== undefined &&
        isSameDependencies(maybeRunning.dependencies, dependencies)
      ) {
        continue
      }

      const { keepAliveEquivalence } = subscription
      if (
        maybeRunning !== undefined &&
        keepAliveEquivalence !== undefined &&
        keepAliveEquivalence(maybeRunning.dependencies, dependencies)
      ) {
        maybeRunning.dependencies = dependencies
        continue
      }

      if (maybeRunning !== undefined) {
        Effect.runFork(Fiber.interrupt(maybeRunning.fiber))
      }

      const readDependencies = (): unknown =>
        node.running.get(name)?.dependencies ?? dependencies
      const fiber = Effect.runSync(
        runInstanceStream(
          node,
          subscription.stream(dependencies, readDependencies),
        ).pipe(Effect.forkIn(node.scope)),
      )
      node.running.set(name, { dependencies, fiber })
    }
  }
}

/** @internal Closes the scopes of instances that left the Model and restarts
 *  Subscriptions whose dependencies changed. */
export const reconcile = (graph: Graph, root: RuntimeInstance): void => {
  const live = new Map<string, RuntimeInstance>()
  collectLive(graph, root, live)

  for (const [key, node] of graph.nodes) {
    if (!live.has(key)) {
      graph.nodes.delete(key)
      Effect.runFork(Scope.close(node.scope, Exit.void))
    }
  }

  syncSubscriptions(graph, live)
}

// NOTE: a Message from an instance's Command, Stream, or Subscription can
// wait in the Runtime's queue while that instance leaves the Model and a new
// one is constructed at the same path. Routing by path alone would deliver it
// to the new instance, so it is dropped instead.
const isFromRemovedInstance = (graph: Graph, message: unknown): boolean => {
  if (!isBlockMessage(message)) {
    return false
  }

  const origin = graph.messageOrigins.get(message)
  return (
    origin !== undefined && graph.nodes.get(pathKey(origin.path)) !== origin
  )
}

/** @internal Applies a Message to the root instance. Messages addressed to a
 *  child arrive wrapped in a {@link BlockMessage}. */
export const update = (
  graph: Graph,
  root: RuntimeInstance,
  message: unknown,
): ApplyResult => {
  if (isFromRemovedInstance(graph, message)) {
    return { instance: root, commands: noCommands, outMessage: undefined }
  }

  const result = isBlockMessage(message)
    ? deliver(root, message.path, message.message)
    : deliver(root, nodeOf(root).path, message)

  reconcile(graph, result.instance)
  return result
}

/** @internal Returns the value an instance exposes, failing when the instance
 *  is not connected. */
export const use = (
  graph: Graph,
  path: Path,
): Effect.Effect<unknown, NotConnected> =>
  Effect.suspend(() => {
    const node = graph.nodes.get(pathKey(path))
    return node === undefined
      ? Effect.fail(new NotConnected({ path }))
      : Effect.succeed(node.impl.expose)
  })

// VIEW

/** @internal Wraps a root view's Html as a Document titled with the root
 *  Block id. A root view that returns a Document is left as it is. */
export const toDocument = (rootId: string, rendered: unknown): unknown =>
  Predicate.hasProperty(rendered, 'body')
    ? rendered
    : { title: rootId, body: rendered }

const withFrame = <A>(frame: Frame, render: () => A): A => {
  pushFrame(frame)
  try {
    return render()
  } finally {
    clearRuntime()
  }
}

const isPlainObject = (value: unknown): value is object => {
  if (!Predicate.isObject(value) || isInstance(value)) {
    return false
  }
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

const currentFrameOf = (frame: Frame | undefined): Frame => {
  if (frame === undefined) {
    throw new Error('[foldkit] A view input function ran before its render.')
  }
  return frame
}

/** Wraps a function, or the functions of a plain object, so they run in the
 *  frame `readFrame` returns when they are called. */
const runningIn = (
  cache: WeakMap<Function, Function>,
  readFrame: () => Frame,
  value: unknown,
  wrapArgs: (arg: unknown) => unknown,
): unknown => {
  if (Predicate.isFunction(value)) {
    const cached = cache.get(value)
    if (cached !== undefined) {
      return cached
    }
    const wrapped = (...args: ReadonlyArray<unknown>) =>
      withFrame(readFrame(), () => value(...args.map(wrapArgs)))
    cache.set(value, wrapped)
    return wrapped
  }

  if (!isPlainObject(value)) {
    return value
  }

  const wrapped: Record<string, unknown> = {}
  for (const key of Object.keys(value)) {
    const field: unknown = Reflect.get(value, key)
    wrapped[key] = Predicate.isFunction(field)
      ? runningIn(cache, readFrame, field, wrapArgs)
      : field
  }
  return wrapped
}

/** Wraps the functions in a view input so they run in the parent's frame,
 *  where the Messages they create are the parent's. Functions the child
 *  passes into those callbacks, such as attribute builders, run back in the
 *  child's frame. */
const wrapViewInput = (viewState: ViewState, input: unknown): unknown => {
  const readParent = () => currentFrameOf(viewState.parentFrame)
  const readChild = () => currentFrameOf(viewState.childFrame)
  const asChild = (arg: unknown): unknown =>
    runningIn(viewState.asChild, readChild, arg, value => value)
  return runningIn(viewState.asParent, readParent, input, asChild)
}

const instanceFrame = (
  node: Node,
  frame: Frame,
  dispatch: DispatchSync,
): Frame => ({
  ...frame,
  outerDispatch: dispatch,
  mountOuterDispatch: dispatch,
  runtimeContext: Context.merge(frame.runtimeContext, node.handlerContext),
  messageMappers: Array.isReadonlyArrayEmpty(node.path)
    ? []
    : [message => blockMessage(node.path, message)],
})

/** @internal Renders the root instance inside the runtime's view frame. */
export const renderRoot = (graph: Graph, root: RuntimeInstance): unknown => {
  const dispatch = requireDispatch()
  graph.rootDispatch = dispatch
  const node = nodeOf(root)
  const { view } = node.impl
  return view === undefined
    ? null
    : withFrame(instanceFrame(node, getCurrentFrame(), dispatch), () =>
        view(root.model, htmlBuilder(), undefined),
      )
}

/** @internal Renders a child instance with a dispatcher that addresses its
 *  Messages to the instance. */
export const renderInstance = (
  instance: RuntimeInstance,
  input: unknown,
): unknown => {
  const node = nodeOf(instance)
  const { view } = node.impl
  if (view === undefined) {
    return null
  }

  const parentFrame = getCurrentFrame()
  const rootDispatch = node.graph.rootDispatch ?? requireDispatch()
  const dispatch: DispatchSync = (message, isCurrent) =>
    rootDispatch(blockMessage(node.path, message), isCurrent)

  const childFrame = instanceFrame(node, parentFrame, dispatch)
  node.viewState.parentFrame = parentFrame
  node.viewState.childFrame = childFrame
  return withFrame(childFrame, () =>
    view(instance.model, htmlBuilder(), wrapViewInput(node.viewState, input)),
  )
}
