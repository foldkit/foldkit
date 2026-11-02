import {
  Array,
  Context,
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

/** The position of a Block instance in the graph, from the root: the ids of
 *  its ancestors and its own id. The root's path is empty. */
export type Path = ReadonlyArray<string>

/** @internal Marks every Block instance. */
export const InstanceTypeId = Symbol.for('foldkit/Block/Instance')

/** @internal Holds the engine view of an instance's Block class on its
 *  prototype. */
export const BlockTypeId = Symbol.for('foldkit/Block/Block')

/** @internal Marks an instance whose `init` has run, so its `model` is its
 *  state. */
export const InitializedTypeId = Symbol.for('foldkit/Block/Initialized')

/** @internal Marks an OutMessage handler entry spread into an update record. */
export const OnEntryTypeId = Symbol.for('foldkit/Block/OnEntry')

/** @internal Marks a Message gate entry spread into an update record. */
export const GateEntryTypeId = Symbol.for('foldkit/Block/GateEntry')

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

/** What `init` receives besides the instance's args. */
export type InitContext = Readonly<{
  /** The instance id, unique among its parent's children. */
  id: string
  /** The instance's path from the root. */
  path: Path
}>

/** @internal The value a Block's Layer constructor returns, as the engine
 *  sees it. */
export type RuntimeImplementation = Readonly<{
  init?: (args: unknown, context: InitContext) => unknown
  start?: (model: unknown, args: unknown) => ReadonlyArray<AnyCommand>
  update?: Readonly<Record<PropertyKey, unknown>>
  view?: (model: unknown, h: unknown, input: unknown) => unknown
  commands?: Readonly<Record<string, (input: unknown) => unknown>>
  mounts?: Readonly<Record<string, (input: unknown) => unknown>>
  subscriptions?: Readonly<Record<string, RuntimeSubscription>>
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

/** @internal A Block implementation built once from its Layer: the
 *  implementation, the context its Layer was built in, which provides the
 *  Blocks its Model holds, and its Command and Mount handlers. */
export type RuntimeModule = Readonly<{
  block: RuntimeBlock
  impl: RuntimeImplementation
  context: Context.Context<never>
  handlerContext: Context.Context<never>
  onEntries: ReadonlyArray<OnEntry>
  gateEntries: ReadonlyArray<GateEntry>
}>

/** @internal The static side of a Block class as the engine sees it. */
export type RuntimeBlock = Readonly<{
  id: string
  prototype: object
  Command: ReadonlyArray<AnyHandlerDefinition>
  Mount: ReadonlyArray<AnyHandlerDefinition>
  service: Context.Key<unknown, RuntimeModule>
}>

/** @internal Shared state for one running graph: a program or a test. */
export type Graph = {
  readonly isSimulation: boolean
  readonly running: Map<string, Running>
  readonly pending: Array<unknown>
  readonly started: Array<AnyCommand>
  readonly messageOrigins: WeakMap<BlockMessage, Running>
  rootModule: RuntimeModule | undefined
  emit: ((message: unknown) => void) | undefined
  rootDispatch: DispatchSync | undefined
  runtimeContext: Deferred.Deferred<Context.Context<never>>
}

/** @internal What runs for one instance while the Model holds it: its
 *  Subscriptions and in-flight Commands. The instance's state is not here;
 *  it is in the Model. */
export type Running = Readonly<{
  graph: Graph
  path: Path
  module: RuntimeModule
  scope: Scope.Closeable
  commandFibers: CommandFibers
  interruptRegistry: unknown
  subscriptions: Map<
    string,
    { dependencies: unknown; fiber: Fiber.Fiber<void> }
  >
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
  parentRunning: Running | undefined
  readonly asParent: WeakMap<Function, Function>
  readonly asChild: WeakMap<Function, Function>
}

/** @internal An OutMessage handler entry. It handles the OutMessages of every
 *  child of `block` under the parent whose update record holds it. */
export type OnEntry = Readonly<{
  [OnEntryTypeId]: true
  block: RuntimeBlock
  handlers: Readonly<
    Record<
      string,
      (model: unknown, outMessage: unknown, instance: unknown) => unknown
    >
  >
}>

/** @internal A Message gate entry. Messages addressed to a child of `block`
 *  reach its update only when the predicate returns true. */
export type GateEntry = Readonly<{
  [GateEntryTypeId]: true
  block: RuntimeBlock
  predicate: (model: unknown, message: unknown) => boolean
}>

/** @internal A Message a parent sends to one of its children from update. */
export type Send = Readonly<{
  [SendTypeId]: true
  childId: string
  message: unknown
}>

/** @internal An instance object as the engine sees it. */
export type RuntimeInstance = Readonly<{
  id: string
  model: unknown
  [InstanceTypeId]: true
  [InitializedTypeId]?: true
}>

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

const makeViewState = (): ViewState => ({
  parentFrame: undefined,
  childFrame: undefined,
  parentRunning: undefined,
  asParent: new WeakMap(),
  asChild: new WeakMap(),
})

// GRAPH

/** @internal Creates the shared state for a running graph. */
export const makeGraph = (
  options: Readonly<{ isSimulation: boolean }>,
): Graph => ({
  isSimulation: options.isSimulation,
  running: new Map(),
  pending: [],
  started: [],
  messageOrigins: new WeakMap(),
  rootModule: undefined,
  emit: undefined,
  rootDispatch: undefined,
  runtimeContext: Deferred.makeUnsafe(),
})

/** @internal Stops everything running in a graph and forgets it, so the
 *  program that owns it can start again from nothing. */
export const disposeGraph = (graph: Graph): Effect.Effect<void> =>
  Effect.suspend(() => {
    const scopes = Array.map(
      Array.fromIterable(graph.running.values()),
      running => Scope.close(running.scope, Exit.void),
    )
    graph.running.clear()
    graph.pending.length = 0
    graph.started.length = 0
    graph.rootModule = undefined
    graph.emit = undefined
    graph.rootDispatch = undefined
    graph.runtimeContext = Deferred.makeUnsafe()
    return Effect.all(scopes, { discard: true })
  })

/** @internal A Stream of the Messages that instance Subscriptions emit. The
 *  runtime consumes it as one Subscription, and the context it runs in,
 *  which carries the program's Ports, becomes the context of every instance
 *  Subscription. */
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

const runningAt = (graph: Graph, path: Path): Option.Option<Running> =>
  Option.fromNullishOr(graph.running.get(pathKey(path)))

// INSTANCES

/** @internal Returns whether a value is a Block instance. */
export const isInstance = (value: unknown): value is RuntimeInstance =>
  Predicate.hasProperty(value, InstanceTypeId)

/** @internal Returns whether an instance's `init` has run. */
export const isInitialized = (instance: RuntimeInstance): boolean =>
  instance[InitializedTypeId] === true

const isRuntimeBlock = (value: unknown): value is RuntimeBlock =>
  Predicate.hasProperty(value, 'service') &&
  Predicate.hasProperty(value, 'prototype')

/** @internal Returns the engine view of an instance's Block class. */
export const blockOf = (instance: RuntimeInstance): RuntimeBlock => {
  const block: unknown = Reflect.get(instance, BlockTypeId)
  if (!isRuntimeBlock(block)) {
    throw new Error('[foldkit] Expected a Block instance.')
  }
  return block
}

const argsOf = (instance: RuntimeInstance): unknown =>
  Reflect.get(instance, 'args')

/** @internal Defines the own fields of an instance value. A value without a
 *  Model is waiting for its `init`, which runs when it first appears in a
 *  Model. */
export const defineInstanceFields = (
  instance: object,
  id: string,
  args: unknown,
  maybeModel: Option.Option<unknown>,
): void => {
  Object.defineProperty(instance, 'id', { value: id, enumerable: true })
  Object.defineProperty(instance, 'args', { value: args, enumerable: false })
  if (Option.isSome(maybeModel)) {
    Object.defineProperty(instance, 'model', {
      value: maybeModel.value,
      enumerable: true,
    })
    Object.defineProperty(instance, InitializedTypeId, {
      value: true,
      enumerable: false,
    })
  }
}

/** @internal Creates an instance value of a Block. */
export const makeInstance = (
  block: RuntimeBlock,
  id: string,
  args: unknown,
  maybeModel: Option.Option<unknown>,
): RuntimeInstance => {
  const instance: object = Object.create(block.prototype)
  defineInstanceFields(instance, id, args, maybeModel)
  if (!isInstance(instance)) {
    throw new Error('[foldkit] Block prototype is missing its brand.')
  }
  return instance
}

const withModel = (
  instance: RuntimeInstance,
  model: unknown,
): RuntimeInstance =>
  isInitialized(instance) && model === instance.model
    ? instance
    : makeInstance(
        blockOf(instance),
        instance.id,
        argsOf(instance),
        Option.some(model),
      )

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

const containsInstances = (value: unknown): boolean =>
  Array.isReadonlyArrayNonEmpty(directInstances(value))

/** @internal Replaces every instance in a Model tree with its own resolved
 *  Model, producing plain data for tests and devtools. */
export const resolve = (value: unknown): unknown =>
  mapInstances(value, instance => resolve(instance.model))

/** @internal Applies resolved data onto a Model tree that holds instances.
 *  Where the template holds an instance, the data is that instance's Model.
 *  Instances in the data are kept as they are, so a test can add children. */
export const hydrate = (data: unknown, template: unknown): unknown => {
  if (data === template || isInstance(data)) {
    return data
  }

  if (!isInstance(template) && !containsInstances(template)) {
    return data
  }

  if (isInstance(template)) {
    return withModel(template, hydrate(data, template.model))
  }

  if (globalThis.Array.isArray(template) && globalThis.Array.isArray(data)) {
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

// MODULES

const lookupModule = (
  context: Context.Context<never>,
  block: RuntimeBlock,
): Option.Option<RuntimeModule> => Context.getOption(context, block.service)

const requireModule = (
  context: Context.Context<never>,
  block: RuntimeBlock,
  ownerId: string,
): RuntimeModule =>
  Option.getOrThrowWith(
    lookupModule(context, block),
    () =>
      new Error(
        `[foldkit] Block "${block.id}" is not provided to ${ownerId}. Provide its Layer to the Layer of the Block whose Model holds it.`,
      ),
  )

const isOnEntry = (value: unknown): value is OnEntry =>
  Predicate.hasProperty(value, OnEntryTypeId)

const isGateEntry = (value: unknown): value is GateEntry =>
  Predicate.hasProperty(value, GateEntryTypeId)

const symbolEntries = (
  update: RuntimeImplementation['update'],
): ReadonlyArray<unknown> =>
  update === undefined
    ? []
    : Array.map(Object.getOwnPropertySymbols(update), key => update[key])

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
        `[foldkit] Block "${block.id}" declares ${kind} "${definition.name}" but its Layer returned no handler for it under \`${kind === 'Command' ? 'commands' : 'mounts'}\`.`,
      )
    }
    return definition.toLayer(Effect.succeed(handler))
  })

/** @internal Builds a Block's module from the implementation its Layer
 *  constructor returned. Runs once, while the program's Layer is built. */
export const makeModule = (
  block: RuntimeBlock,
  impl: RuntimeImplementation,
): Effect.Effect<RuntimeModule, never, Scope.Scope> =>
  Effect.gen(function* () {
    const context = yield* Effect.context<never>()
    const layers = [
      ...handlerLayers(block, 'Command', block.Command, impl.commands),
      ...handlerLayers(block, 'Mount', block.Mount, impl.mounts),
    ]
    const handlerContext = Array.isReadonlyArrayEmpty(layers)
      ? Context.empty()
      : yield* Layer.build(
          Array.reduce(
            layers,
            Layer.empty,
            (combined: Layer.Layer<never>, layer) =>
              Layer.merge(combined, layer),
          ),
        )
    const entries = symbolEntries(impl.update)
    return {
      block,
      impl,
      context,
      handlerContext,
      onEntries: Array.filter(entries, isOnEntry),
      gateEntries: Array.filter(entries, isGateEntry),
    }
  })

// INITIALIZATION

/** Runs `init` for every instance in a value that has not been initialized,
 *  giving each the path its position under `parentPath` makes. */
const initializeIn = (
  parent: RuntimeModule,
  parentPath: Path,
  value: unknown,
): unknown =>
  mapInstances(value, child => {
    const block = blockOf(child)
    const path = [...parentPath, child.id]

    if (isInitialized(child)) {
      return Option.match(lookupModule(parent.context, block), {
        onNone: () => child,
        onSome: module =>
          withModel(child, initializeIn(module, path, child.model)),
      })
    }

    const module = requireModule(parent.context, block, `"${parent.block.id}"`)
    const model = module.impl.init?.(argsOf(child), { id: child.id, path })
    return withModel(child, initializeIn(module, path, model))
  })

const rootModuleOf = (graph: Graph): RuntimeModule => {
  if (graph.rootModule === undefined) {
    throw new Error('[foldkit] The Block graph has no root.')
  }
  return graph.rootModule
}

/** @internal Creates and initializes the root instance of a graph from the
 *  context the program's Layer built, and starts everything its Model
 *  holds. The root's `start` Commands wait in {@link takeStarted}. */
export const constructRoot = (
  graph: Graph,
  block: RuntimeBlock,
  args: unknown,
  context: Context.Context<never>,
): RuntimeInstance => {
  const module = requireModule(context, block, 'the program')
  graph.rootModule = module
  const model = module.impl.init?.(args, { id: block.id, path: [] })
  const root = makeInstance(
    block,
    block.id,
    args,
    Option.some(initializeIn(module, [], model)),
  )
  reconcile(graph, root)
  return root
}

/** @internal Replaces the root's Model with a preserved one and starts what
 *  it holds, dropping the `start` Commands of every instance that starts:
 *  the preserved Model already reflects their results. */
export const restore = (
  graph: Graph,
  root: RuntimeInstance,
  preservedModel: unknown,
): RuntimeInstance => {
  const module = rootModuleOf(graph)
  const restored = withModel(root, initializeIn(module, [], preservedModel))
  reconcile(graph, restored)
  takeStarted(graph)
  return restored
}

/** @internal Runs `init` for every instance in the root's Model that has not
 *  been initialized, such as children a test's `given` adds, and starts
 *  them. Their `start` Commands are dropped: `given` sets up state, it is
 *  not an update. */
export const settle = (
  graph: Graph,
  root: RuntimeInstance,
): RuntimeInstance => {
  const settled = withModel(
    root,
    initializeIn(rootModuleOf(graph), [], root.model),
  )
  reconcile(graph, settled)
  takeStarted(graph)
  return settled
}

// RECONCILIATION

type Wanted = Readonly<{
  path: Path
  module: RuntimeModule
  instance: RuntimeInstance
}>

const collectWanted = (
  module: RuntimeModule,
  path: Path,
  instance: RuntimeInstance,
  wanted: Map<string, Wanted>,
): void => {
  wanted.set(pathKey(path), { path, module, instance })
  const ids = new Set<string>()
  for (const child of directInstances(instance.model)) {
    const maybeModule = lookupModule(module.context, blockOf(child))
    if (Option.isNone(maybeModule) || !isInitialized(child)) {
      continue
    }

    if (ids.has(child.id)) {
      throw new Error(
        `[foldkit] Block "${module.block.id}" holds two children with id "${child.id}". Ids must be unique among one parent's children.`,
      )
    }
    ids.add(child.id)
    collectWanted(maybeModule.value, [...path, child.id], child, wanted)
  }
}

const startRunning = (graph: Graph, entry: Wanted): Running => {
  const scope = Scope.makeUnsafe()
  const commandFibers: CommandFibers = { isClosed: false, fibers: new Set() }
  Effect.runSync(
    Scope.addFinalizer(
      scope,
      Effect.sync(() => {
        commandFibers.isClosed = true
        for (const fiber of commandFibers.fibers) {
          Effect.runFork(Fiber.interrupt(fiber))
        }
      }),
    ),
  )
  const running: Running = {
    graph,
    path: entry.path,
    module: entry.module,
    scope,
    commandFibers,
    interruptRegistry: makeInterruptRegistry(),
    subscriptions: new Map(),
    viewState: makeViewState(),
  }
  graph.running.set(pathKey(entry.path), running)
  graph.started.push(
    ...Array.map(
      entry.module.impl.start?.(entry.instance.model, argsOf(entry.instance)) ??
        noCommands,
      command => bindCommand(graph, entry.path, command),
    ),
  )
  return running
}

/** @internal Makes what runs match the Model. An instance that appeared
 *  starts: its `start` Commands are queued and its Subscriptions run. An
 *  instance that left stops: its Subscriptions end and its in-flight
 *  Commands are interrupted. An instance that stayed keeps running, and its
 *  Subscriptions restart when their dependencies change. */
export const reconcile = (graph: Graph, root: RuntimeInstance): void => {
  const wanted = new Map<string, Wanted>()
  collectWanted(rootModuleOf(graph), [], root, wanted)

  for (const [key, running] of graph.running) {
    const maybeWanted = wanted.get(key)
    if (
      maybeWanted === undefined ||
      maybeWanted.module.block !== running.module.block
    ) {
      graph.running.delete(key)
      Effect.runFork(Scope.close(running.scope, Exit.void))
    }
  }

  for (const [key, entry] of wanted) {
    const running = graph.running.get(key) ?? startRunning(graph, entry)
    syncSubscriptions(running, entry.instance.model)
  }
}

/** @internal Returns the `start` Commands of instances that started since
 *  the last call. */
export const takeStarted = (graph: Graph): ReadonlyArray<AnyCommand> =>
  graph.started.splice(0)

// COMMANDS

// NOTE: the fiber is interrupted from outside, never by `Effect.interrupt`.
// The runtime catches every failure cause of a Command to crash the app, and
// that includes a fiber interrupting itself. An outside interrupt ends the
// fiber before the runtime's handler runs.
const runWhileLive = <A, E, R>(
  { commandFibers }: Running,
  effect: Effect.Effect<A, E, R>,
): Effect.Effect<A, E, R> =>
  Effect.withFiber(fiber =>
    Effect.uninterruptibleMask(restoreInterruption =>
      Effect.suspend(() => {
        if (commandFibers.isClosed) {
          Effect.runFork(Fiber.interrupt(fiber))
          return restoreInterruption(Effect.never)
        }

        commandFibers.fibers.add(fiber)
        return restoreInterruption(effect).pipe(
          Effect.ensuring(
            Effect.sync(() => commandFibers.fibers.delete(fiber)),
          ),
        )
      }),
    ),
  )

const makeClosedRunning = (graph: Graph, path: Path): Running => ({
  graph,
  path,
  module: rootModuleOf(graph),
  scope: Scope.makeUnsafe(),
  commandFibers: { isClosed: true, fibers: new Set() },
  interruptRegistry: makeInterruptRegistry(),
  subscriptions: new Map(),
  viewState: makeViewState(),
})

// NOTE: a Command belongs to the instance running at its path when update
// returns it. An instance created in that same update is not running yet,
// so its Command belongs to whatever runs at the path when it starts.
const bindCommand = (
  graph: Graph,
  path: Path,
  command: AnyCommand,
): AnyCommand => {
  const maybeOwner = runningAt(graph, path)

  const owner = (): Running =>
    Option.match(maybeOwner, {
      onNone: () =>
        Option.getOrElse(runningAt(graph, path), () =>
          makeClosedRunning(graph, path),
        ),
      onSome: bound =>
        graph.running.get(pathKey(path)) === bound
          ? bound
          : makeClosedRunning(graph, path),
    })

  /* eslint-disable @typescript-eslint/consistent-type-assertions */
  const provided = mapEffect(command as never, effect =>
    Effect.suspend(() => {
      const running = owner()
      return runWhileLive(
        running,
        Effect.updateContext(effect as Effect.Effect<unknown>, context =>
          Context.add(
            Context.merge(context, running.module.handlerContext),
            CurrentInterruptRegistry,
            running.interruptRegistry as never,
          ),
        ),
      )
    }),
  ) as AnyCommand

  return Array.isReadonlyArrayEmpty(path)
    ? provided
    : (mapMessage(provided as never, message => {
        const wrapped = blockMessage(path, message)
        Option.map(runningAt(graph, path), running =>
          graph.messageOrigins.set(wrapped, running),
        )
        return wrapped
      }) as AnyCommand)
  /* eslint-enable @typescript-eslint/consistent-type-assertions */
}

// UPDATE

const isUpdateResult = (value: unknown): value is UpdateResult =>
  Predicate.isObject(value)

const isSend = (value: unknown): value is Send =>
  Predicate.hasProperty(value, SendTypeId)

const tagOf = (message: unknown): string | undefined => {
  const tag: unknown = Predicate.hasProperty(message, '_tag')
    ? message._tag
    : undefined
  return Predicate.isString(tag) ? tag : undefined
}

const findOnHandler = (
  module: RuntimeModule,
  child: RuntimeInstance,
  outMessage: unknown,
):
  | ((model: unknown, outMessage: unknown, instance: unknown) => unknown)
  | undefined => {
  const tag = tagOf(outMessage)
  if (tag === undefined) {
    return undefined
  }

  const block = blockOf(child)
  return Option.match(
    Array.findFirst(
      module.onEntries,
      entry => entry.block === block && entry.handlers[tag] !== undefined,
    ),
    {
      onNone: () => undefined,
      onSome: ({ handlers }) => handlers[tag],
    },
  )
}

const isRefusedByGate = (
  module: RuntimeModule,
  model: unknown,
  child: RuntimeInstance,
  message: unknown,
): boolean => {
  const block = blockOf(child)
  return Array.some(
    module.gateEntries,
    entry => entry.block === block && !entry.predicate(model, message),
  )
}

const makeUpdater = (graph: Graph) => {
  const applyResult = (
    module: RuntimeModule,
    path: Path,
    instance: RuntimeInstance,
    result: unknown,
  ): ApplyResult => {
    if (!isUpdateResult(result)) {
      throw new Error(
        `[foldkit] A Block update handler returned ${globalThis.String(result)} instead of \`{ model }\`.`,
      )
    }

    let current = withModel(instance, initializeIn(module, path, result.model))
    let commands = Array.map(result.commands ?? noCommands, command =>
      bindCommand(graph, path, command),
    )
    let { outMessage } = result

    for (const send of result.messages ?? []) {
      if (!isSend(send)) {
        throw new Error(
          '[foldkit] `messages` holds a value that `instance.send` did not create.',
        )
      }
      const sent = deliver(
        module,
        path,
        current,
        [...path, send.childId],
        send.message,
        true,
      )
      current = sent.instance
      commands = [...commands, ...sent.commands]
      if (sent.outMessage !== undefined) {
        outMessage = sent.outMessage
      }
    }

    return { instance: current, commands, outMessage }
  }

  const applyLocal = (
    module: RuntimeModule,
    path: Path,
    instance: RuntimeInstance,
    message: unknown,
  ): ApplyResult => {
    const tag = tagOf(message)
    const handler =
      tag !== undefined && module.impl.update !== undefined
        ? module.impl.update[tag]
        : undefined

    if (!Predicate.isFunction(handler)) {
      throw new Error(
        `[foldkit] Block "${module.block.id}" has no update handler for Message "${globalThis.String(tag)}".`,
      )
    }

    return applyResult(module, path, instance, handler(instance.model, message))
  }

  // NOTE: a gate filters the Messages a child receives from its view,
  // Commands, and Subscriptions. A Message the parent sends with `send` is
  // the parent's own decision, so it skips the parent's gates.
  const deliver = (
    module: RuntimeModule,
    path: Path,
    instance: RuntimeInstance,
    target: Path,
    message: unknown,
    isSentByParent: boolean,
  ): ApplyResult => {
    if (target.length === path.length) {
      return applyLocal(module, path, instance, message)
    }

    const childId = target[path.length]
    const maybeChild = Array.findFirst(
      directInstances(instance.model),
      child => child.id === childId && isInitialized(child),
    )
    if (Option.isNone(maybeChild)) {
      return { instance, commands: noCommands, outMessage: undefined }
    }

    const child = maybeChild.value
    const maybeChildModule = lookupModule(module.context, blockOf(child))
    if (Option.isNone(maybeChildModule)) {
      return { instance, commands: noCommands, outMessage: undefined }
    }

    const childPath = [...path, child.id]
    if (
      !isSentByParent &&
      target.length === childPath.length &&
      isRefusedByGate(module, instance.model, child, message)
    ) {
      return { instance, commands: noCommands, outMessage: undefined }
    }

    const delivered = deliver(
      maybeChildModule.value,
      childPath,
      child,
      target,
      message,
      false,
    )
    const parent = withModel(
      instance,
      mapInstances(instance.model, candidate =>
        candidate === child ? delivered.instance : candidate,
      ),
    )

    const handler =
      delivered.outMessage === undefined
        ? undefined
        : findOnHandler(module, delivered.instance, delivered.outMessage)

    if (handler === undefined) {
      return {
        instance: parent,
        commands: delivered.commands,
        outMessage: undefined,
      }
    }

    const handled = applyResult(
      module,
      path,
      parent,
      handler(parent.model, delivered.outMessage, delivered.instance),
    )

    return {
      instance: handled.instance,
      commands: [...delivered.commands, ...handled.commands],
      outMessage: handled.outMessage,
    }
  }

  return deliver
}

// NOTE: a Message from an instance's Command or Subscription can wait in the
// Runtime's queue while that instance leaves the Model and another starts at
// the same path. Routing by path alone would deliver it to the new instance,
// so it is dropped instead.
const isFromRemovedInstance = (graph: Graph, message: unknown): boolean => {
  if (!isBlockMessage(message)) {
    return false
  }

  const origin = graph.messageOrigins.get(message)
  return (
    origin !== undefined && graph.running.get(pathKey(origin.path)) !== origin
  )
}

/** @internal Applies a Message to the root instance. Messages addressed to a
 *  child arrive wrapped in a {@link BlockMessage}. Returns the next root, the
 *  Commands to run, including the `start` Commands of instances that
 *  appeared, and the root's OutMessage. */
export const update = (
  graph: Graph,
  root: RuntimeInstance,
  message: unknown,
): ApplyResult => {
  if (isFromRemovedInstance(graph, message)) {
    return { instance: root, commands: noCommands, outMessage: undefined }
  }

  const deliver = makeUpdater(graph)
  const module = rootModuleOf(graph)
  const result = isBlockMessage(message)
    ? deliver(module, [], root, message.path, message.message, false)
    : deliver(module, [], root, [], message, false)

  reconcile(graph, result.instance)
  return {
    instance: result.instance,
    commands: [...result.commands, ...takeStarted(graph)],
    outMessage: result.outMessage,
  }
}

// SUBSCRIPTIONS

const runSubscription = (
  running: Running,
  stream: Stream.Stream<unknown>,
): Effect.Effect<void> =>
  Effect.flatMap(Deferred.await(running.graph.runtimeContext), runtimeContext =>
    Stream.runForEach(stream, message =>
      Effect.sync(() => {
        if (Array.isReadonlyArrayEmpty(running.path)) {
          emit(running.graph, message)
        } else {
          const wrapped = blockMessage(running.path, message)
          running.graph.messageOrigins.set(wrapped, running)
          emit(running.graph, wrapped)
        }
      }),
    ).pipe(
      Effect.updateContext((context: Context.Context<never>) =>
        Context.merge(runtimeContext, context),
      ),
    ),
  )

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

const syncSubscriptions = (running: Running, model: unknown): void => {
  const { subscriptions } = running.module.impl
  if (running.graph.isSimulation || subscriptions === undefined) {
    return
  }

  for (const [name, subscription] of Object.entries(subscriptions)) {
    const dependencies = subscription.dependencies(model)
    const maybeCurrent = running.subscriptions.get(name)
    if (
      maybeCurrent !== undefined &&
      isSameDependencies(maybeCurrent.dependencies, dependencies)
    ) {
      continue
    }

    const { keepAliveEquivalence } = subscription
    if (
      maybeCurrent !== undefined &&
      keepAliveEquivalence !== undefined &&
      keepAliveEquivalence(maybeCurrent.dependencies, dependencies)
    ) {
      maybeCurrent.dependencies = dependencies
      continue
    }

    if (maybeCurrent !== undefined) {
      Effect.runFork(Fiber.interrupt(maybeCurrent.fiber))
    }

    const readDependencies = (): unknown =>
      running.subscriptions.get(name)?.dependencies ?? dependencies
    const fiber = Effect.runSync(
      runSubscription(
        running,
        subscription.stream(dependencies, readDependencies),
      ).pipe(Effect.forkIn(running.scope)),
    )
    running.subscriptions.set(name, { dependencies, fiber })
  }
}

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
  enter: <A>(render: () => A) => A,
  value: unknown,
  wrapArgs: (arg: unknown) => unknown,
): unknown => {
  if (Predicate.isFunction(value)) {
    const cached = cache.get(value)
    if (cached !== undefined) {
      return cached
    }
    const wrapped = (...args: ReadonlyArray<unknown>) =>
      enter(() => value(...args.map(wrapArgs)))
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
      ? runningIn(cache, enter, field, wrapArgs)
      : field
  }
  return wrapped
}

/** Wraps the functions in a view input so they run as the parent: in its
 *  frame, where the Messages they create are the parent's, and as the
 *  instance rendering, so the parent's own children render at their paths.
 *  Functions the child passes into those callbacks, such as attribute
 *  builders, run back as the child. */
const wrapViewInput = (
  viewState: ViewState,
  childRunning: Running,
  input: unknown,
): unknown => {
  const asParent = <A>(render: () => A): A => {
    const enterFrame = () =>
      withFrame(currentFrameOf(viewState.parentFrame), render)
    return viewState.parentRunning === undefined
      ? enterFrame()
      : withRendering(viewState.parentRunning, enterFrame)
  }
  const asChild = <A>(render: () => A): A =>
    withRendering(childRunning, () =>
      withFrame(currentFrameOf(viewState.childFrame), render),
    )
  const wrapChildArg = (arg: unknown): unknown =>
    runningIn(viewState.asChild, asChild, arg, value => value)
  return runningIn(viewState.asParent, asParent, input, wrapChildArg)
}

const instanceFrame = (
  running: Running,
  frame: Frame,
  dispatch: DispatchSync,
): Frame => ({
  ...frame,
  outerDispatch: dispatch,
  mountOuterDispatch: dispatch,
  runtimeContext: Context.merge(
    frame.runtimeContext,
    running.module.handlerContext,
  ),
  messageMappers: Array.isReadonlyArrayEmpty(running.path)
    ? []
    : [message => blockMessage(running.path, message)],
})

const renderStack: Array<Running> = []

const withRendering = <A>(running: Running, render: () => A): A => {
  renderStack.push(running)
  try {
    return render()
  } finally {
    renderStack.pop()
  }
}

/** @internal Renders the root instance inside the runtime's view frame. */
export const renderRoot = (graph: Graph, root: RuntimeInstance): unknown => {
  const dispatch = requireDispatch()
  graph.rootDispatch = dispatch
  const running = Option.getOrThrowWith(
    runningAt(graph, []),
    () => new Error('[foldkit] The Block graph has no running root.'),
  )
  const { view } = running.module.impl
  return view === undefined
    ? null
    : withRendering(running, () =>
        withFrame(instanceFrame(running, getCurrentFrame(), dispatch), () =>
          view(root.model, htmlBuilder(), undefined),
        ),
      )
}

/** @internal Renders a child instance from its parent's view, with a
 *  dispatcher that addresses its Messages to its path. */
export const renderInstance = (
  instance: RuntimeInstance,
  input: unknown,
): unknown => {
  const parent = renderStack[renderStack.length - 1]
  if (parent === undefined) {
    throw new Error(
      `[foldkit] Block instance "${instance.id}" rendered outside its parent's view.`,
    )
  }

  const { graph } = parent
  const path = [...parent.path, instance.id]
  const running = Option.getOrThrowWith(
    runningAt(graph, path),
    () =>
      new Error(
        `[foldkit] Block instance "${instance.id}" is not in its parent's Model. An instance renders only while its parent's Model holds it.`,
      ),
  )
  const { view } = running.module.impl
  if (view === undefined) {
    return null
  }

  const parentFrame = getCurrentFrame()
  const rootDispatch = graph.rootDispatch ?? requireDispatch()
  const dispatch: DispatchSync = (message, isCurrent) =>
    rootDispatch(blockMessage(path, message), isCurrent)

  const childFrame = instanceFrame(running, parentFrame, dispatch)
  running.viewState.parentFrame = parentFrame
  running.viewState.childFrame = childFrame
  running.viewState.parentRunning = parent
  return withRendering(running, () =>
    withFrame(childFrame, () =>
      view(
        instance.model,
        htmlBuilder(),
        wrapViewInput(running.viewState, running, input),
      ),
    ),
  )
}
