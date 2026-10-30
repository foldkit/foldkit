import {
  Array,
  Context,
  Effect,
  Layer,
  Option,
  Predicate,
  Schema,
  SchemaIssue,
  SchemaParser,
  SchemaTransformation,
} from 'effect'

import type { Ports } from '../port/index.js'
import {
  __makeElementFromConfig,
  __makeFromConfig,
} from '../runtime/application.js'
import {
  type RoutingInputConfig,
  normalizeRoutingInputConfig,
} from '../runtime/browserListeners.js'
import type { CrashConfig, ElementCrashConfig } from '../runtime/crashUI.js'
import {
  type DevToolsConfig,
  resolveProgramDevToolsConfig,
} from '../runtime/devToolsConfig.js'
import { runtimeInternals } from '../runtime/runtime.js'
import type { SlowConfig } from '../runtime/slowPhase.js'
import type { ViewTransitionConfig } from '../runtime/viewTransition.js'
import { type Url, fromString as urlFromString } from '../url/index.js'
import { blockRegistry, runtimeBlockOf } from './block.js'
import {
  type BlockMessage,
  type RuntimeInstance,
  constructSync,
  disposeGraph,
  graphMessages,
  isInstance,
  makeGraph,
  reconcile,
  renderRoot,
  restore,
  takeStarted,
  toDocument,
  update,
} from './engine.js'

/** @internal The members a root Block instance exposes to program typing. */
export type RootInstance = Readonly<{
  '~args'?: (args: never) => unknown
  send: (message: never) => unknown
}>

/** @internal The constructor args of a Block instance type. */
export type ArgsOf<Root> =
  Root extends Readonly<{
    '~args'?: (args: infer Args) => unknown
  }>
    ? Args
    : never

type MessageOf<Root> =
  Root extends Readonly<{
    send: (message: infer Message) => unknown
  }>
    ? Message
    : never

type CommonOptions<Root> = Readonly<{
  /** Provides the root Block, every Block it creates, and their services. */
  layer: Layer.Layer<Root, unknown, never>
  /** The element the program renders into. It needs an `id`. */
  container: HTMLElement | null
  devTools?: DevToolsConfig
  slow?: SlowConfig<Root, MessageOf<Root> | BlockMessage>
  preserveScroll?: boolean
  ports?: Ports
}>

type ArgOptions<Root> = (ArgsOf<Root> extends Readonly<{ url: Url }>
  ? Readonly<{
      /** Delivers link clicks and URL changes to the root Block. The root
       *  constructor receives the starting URL as `url`. */
      routing: RoutingInputConfig<MessageOf<Root>>
    }>
  : Readonly<{ routing?: never }>) &
  (ArgsOf<Root> extends Readonly<{ flags: infer Flags }>
    ? Readonly<{
        /** Decodes the Flags the root constructor receives as `flags`. */
        Flags: Schema.Codec<Flags, any, never, never>
      }>
    : Readonly<{ Flags?: never }>)

/** Options for a page-owning Block program. The root Block's args decide
 *  which are required: `{ url }` requires `routing`, `{ flags }` requires
 *  `Flags`. */
export type ProgramOptions<Root> = CommonOptions<Root> &
  ArgOptions<Root> &
  Readonly<{
    crash?: CrashConfig<Root, MessageOf<Root>>
    viewTransition?: ViewTransitionConfig<Root, MessageOf<Root>>
  }>

/** Options for a container-scoped Block program. */
export type ElementOptions<Root> = CommonOptions<Root> &
  ArgOptions<Root> &
  Readonly<{
    crash?: ElementCrashConfig<Root, MessageOf<Root>>
  }>

const BlockMessageSchema = Schema.Struct({
  _tag: Schema.Literal('BlockMessage'),
  path: Schema.Array(Schema.String),
  message: Schema.Unknown,
})

/** Block programs record a Model snapshot for every Message. Replaying
 *  `update` to rebuild a past Model would construct and release live
 *  instances. */
const withSnapshotPerMessage = (devTools: unknown): DevToolsConfig => {
  if (devTools === false) {
    return false
  } else if (isDevToolsConfigObject(devTools)) {
    return { ...devTools, keyframeInterval: 1 }
  } else {
    return { keyframeInterval: 1 }
  }
}

const isDevToolsConfigObject = (
  value: unknown,
): value is Exclude<DevToolsConfig, false> => Predicate.isObject(value)

/** A Block program. Pass it to `Runtime.run`, `Runtime.embed`, or
 *  `Runtime.hydrate`. `P` is the Ports the program declares, which
 *  `Runtime.embed` turns into the handle's typed `ports`. */
export type Program<P extends Ports | undefined = undefined> = Readonly<{
  runtimeId: string
  start: (preservedModel?: unknown) => Effect.Effect<void>
  ports: P
}>

const PreservedRoot = Schema.Struct({
  flags: Schema.Unknown,
  root: Schema.Unknown,
})

const unknownCodec = (schema: unknown): Schema.Codec<unknown, unknown> =>
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  Schema.toCodecJson(schema as Schema.Codec<unknown, unknown>)

const makeBlockProgram = (
  root: object,
  options: object,
  kind: 'Application' | 'Element',
): Program<Ports | undefined> => {
  const block = runtimeBlockOf(root)
  const graph = makeGraph({ isSimulation: false })
  const {
    layer,
    routing,
    Flags,
    ...hostOptions
  }: Readonly<Record<string, unknown>> = { ...options }
  let maybeContext: Context.Context<never> | undefined

  const constructRoot = (
    args: unknown,
  ): Readonly<{ model: RuntimeInstance; commands: ReadonlyArray<unknown> }> => {
    if (maybeContext === undefined) {
      throw new Error(
        `[foldkit] Block program "${block.id}" started before its Layer was built.`,
      )
    }
    const model = constructSync(graph, block, [], block.id, args, maybeContext)
    reconcile(graph, model)
    return { model, commands: takeStarted(graph) }
  }

  const hasRouting = routing !== undefined
  const hasFlags = Flags !== undefined

  const rootArgs = (flags: unknown, url: unknown): unknown => {
    if (hasFlags && hasRouting) {
      return { flags, url }
    } else if (hasRouting) {
      return { url }
    } else if (hasFlags) {
      return { flags }
    } else {
      return undefined
    }
  }

  const init = (first?: unknown, second?: unknown) =>
    hasFlags
      ? constructRoot(rootArgs(first, second))
      : constructRoot(rootArgs(undefined, first))

  const RootJson = unknownCodec(root)
  const maybeFlagsJson = hasFlags ? unknownCodec(Flags) : undefined

  const currentUrl = (): Url | undefined =>
    Option.getOrUndefined(urlFromString(window.location.href))

  const restoreRoot = (
    flags: unknown,
    stand: unknown,
  ): Effect.Effect<RuntimeInstance, SchemaIssue.Issue> =>
    Effect.try({
      try: () => {
        if (!isInstance(stand)) {
          throw new Error('[foldkit] The preserved root is not a Block.')
        }
        const fresh = constructRoot(rootArgs(flags, currentUrl()))
        return restore(graph, fresh.model, stand)
      },
      catch: error =>
        new SchemaIssue.InvalidValue(
          { message: globalThis.String(error) },
          stand,
        ),
    })

  const RootModel = Schema.declare(
    (value: unknown): value is RuntimeInstance => isInstance(value),
    {
      toCodecJson: () =>
        Schema.link<RuntimeInstance>()(
          PreservedRoot,
          SchemaTransformation.transformEffect({
            decode: ({ flags, root: preservedRoot }, parseOptions) =>
              Effect.gen(function* () {
                const stand = yield* SchemaParser.decodeUnknownEffect(RootJson)(
                  preservedRoot,
                  parseOptions,
                )
                const decodedFlags =
                  maybeFlagsJson === undefined
                    ? undefined
                    : yield* SchemaParser.decodeUnknownEffect(maybeFlagsJson)(
                        flags,
                        parseOptions,
                      )
                return yield* restoreRoot(decodedFlags, stand)
              }),
            encode: (instance, parseOptions) =>
              Effect.gen(function* () {
                const encodedRoot = yield* SchemaParser.encodeUnknownEffect(
                  RootJson,
                )(instance, parseOptions)
                const args: unknown = Reflect.get(instance, 'args')
                const encodedFlags =
                  maybeFlagsJson === undefined
                    ? null
                    : yield* SchemaParser.encodeUnknownEffect(maybeFlagsJson)(
                        Reflect.get(Object(args), 'flags'),
                        parseOptions,
                      )
                return { flags: encodedFlags, root: encodedRoot }
              }),
          }),
        ),
    },
  )

  const rootMessage: unknown = Reflect.get(root, 'Message')
  const dispatchSchema = Schema.isSchema(rootMessage)
    ? Schema.Union([rootMessage, BlockMessageSchema])
    : BlockMessageSchema

  const config = {
    ...hostOptions,
    devTools: resolveProgramDevToolsConfig(
      withSnapshotPerMessage(hostOptions['devTools']),
      dispatchSchema,
    ),
    Model: RootModel,
    ...(hasFlags && { Flags }),
    ...(hasRouting && {
      routing: normalizeRoutingInputConfig(
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
        routing as RoutingInputConfig<unknown>,
      ),
    }),
    init,
    update: (model: RuntimeInstance, message: unknown) => {
      const result = update(graph, model, message)
      return { model: result.instance, commands: result.commands }
    },
    view: (model: RuntimeInstance) =>
      kind === 'Application'
        ? toDocument(block.id, renderRoot(graph, model))
        : renderRoot(graph, model),
    subscriptions: {
      blocks: {
        dependenciesSchema: Schema.Struct({}),
        modelToDependencies: () => ({}),
        dependenciesToStream: () => graphMessages(graph),
      },
    },
    freezeModel: false,
    mounts: Array.flatMap(
      Array.fromIterable(blockRegistry),
      ({ Mount }) => Mount,
    ),
  }

  /* eslint-disable @typescript-eslint/consistent-type-assertions */
  const program = (
    kind === 'Application'
      ? __makeFromConfig(config as never)
      : __makeElementFromConfig(config as never)
  ) as Program<Ports | undefined>
  /* eslint-enable @typescript-eslint/consistent-type-assertions */

  const internals = runtimeInternals.get(program)
  if (internals === undefined) {
    throw new Error('[foldkit] Expected a runtime program.')
  }

  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  const blockLayer = layer as Layer.Layer<unknown, unknown, never>

  const withBlockLayer = <A>(start: Effect.Effect<A>): Effect.Effect<A> =>
    Effect.scoped(
      Effect.gen(function* () {
        maybeContext = yield* Layer.build(blockLayer).pipe(Effect.orDie)
        yield* Effect.addFinalizer(() => disposeGraph(graph))
        return yield* start
      }),
    )

  const withBlockContext = <A, E, R>(
    maybeFlags: Effect.Effect<A, E, R> | undefined,
  ): Effect.Effect<A, E, R> | undefined =>
    maybeFlags === undefined
      ? undefined
      : Effect.suspend(() =>
          maybeContext === undefined
            ? maybeFlags
            : Effect.updateContext(maybeFlags, context =>
                Context.merge(maybeContext ?? Context.empty(), context),
              ),
        )

  const { startWith, startWithApplicationLayer } = internals
  internals.startWith = (connector, preserved, bootMode, flags, buildId) =>
    withBlockLayer(
      startWith(
        connector,
        preserved,
        bootMode,
        withBlockContext(flags),
        buildId,
      ),
    )
  internals.startWithApplicationLayer = (
    connector,
    preserved,
    bootMode,
    flags,
    buildId,
    applicationLayer,
  ) =>
    withBlockLayer(
      startWithApplicationLayer(
        connector,
        preserved,
        bootMode,
        withBlockContext(flags),
        buildId,
        applicationLayer,
      ),
    )

  const { start } = program
  Object.defineProperty(program, 'start', {
    value: (preservedModel?: unknown) => withBlockLayer(start(preservedModel)),
  })

  return program
}

/** Creates a page-owning program from a root Block class. The root
 *  constructor receives `{ url }` when the program has routing, `{ flags }`
 *  when it has Flags, and both when it has both. */
export const make = <
  Root extends RootInstance,
  const P extends Ports | undefined = undefined,
>(
  root: abstract new (...args: ReadonlyArray<any>) => Root,
  options: ProgramOptions<NoInfer<Root>> & Readonly<{ ports?: P }>,
): Program<P> =>
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  makeBlockProgram(root, options, 'Application') as Program<P>

/** Creates a container-scoped program from a root Block class. Its view
 *  returns Html, and it never touches the document head. */
export const makeElement = <
  Root extends RootInstance,
  const P extends Ports | undefined = undefined,
>(
  root: abstract new (...args: ReadonlyArray<any>) => Root,
  options: ElementOptions<NoInfer<Root>> & Readonly<{ ports?: P }>,
): Program<P> =>
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  makeBlockProgram(root, options, 'Element') as Program<P>
