import {
  Array,
  Cause,
  Context,
  Effect,
  Function,
  Layer,
  Option,
  Predicate,
  Queue,
  Record,
  Ref,
  Runtime,
  Schema,
  Stream,
  SubscriptionRef,
  pipe,
} from 'effect'

import type { Command } from '../command'
import { Dispatch } from '../runtime/dispatch'
import type {
  ManagedResourceConfig,
  ManagedResources,
} from '../runtime/managedResource'
import type { SlowViewConfig } from '../runtime/runtime'
import type { Subscriptions } from '../runtime/subscription'
import type { TerminalRenderState } from './platform'
import { Terminal, createTarget } from './platform'
import type { TerminalView } from './view'

type AnyCommand<T, E = never, R = never> = {
  readonly name: string
  readonly effect: Effect.Effect<T, E, R>
}

const DEFAULT_SLOW_VIEW_THRESHOLD_MS = 16

const defaultSlowViewCallback = (context: {
  durationMs: number
  thresholdMs: number
  message: Option.Option<unknown>
}): void => {
  const trigger = Option.match(context.message, {
    onNone: () => 'init',
    onSome: message => {
      const tag =
        Predicate.isRecord(message) && '_tag' in message
          ? String(message['_tag'])
          : 'unknown'
      return tag
    },
  })

  console.warn(
    `[foldkit] Slow view: ${context.durationMs.toFixed(1)}ms (budget: ${context.thresholdMs}ms), triggered by ${trigger}.`,
  )
}

/** Terminal crash config — report only, no custom view. */
export type TerminalCrashConfig<Model, Message> = Readonly<{
  report?: (
    context: Readonly<{ error: Error; model: Model; message: Message }>,
  ) => void
}>

/** Configuration for terminal programs without flags. */
export type TerminalProgramConfig<
  Model,
  Message,
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
  Resources = never,
  ManagedResourceServices = never,
> = Readonly<{
  Model: Schema.Schema<Model, any, never>
  init: () => readonly [
    Model,
    ReadonlyArray<Command<Message, never, Resources | ManagedResourceServices>>,
  ]
  update: (
    model: Model,
    message: Message,
  ) => readonly [
    Model,
    ReadonlyArray<Command<Message, never, Resources | ManagedResourceServices>>,
  ]
  view: (model: Model) => TerminalView
  subscriptions?: Subscriptions<
    Model,
    Message,
    StreamDepsMap,
    Resources | ManagedResourceServices
  >
  crash?: TerminalCrashConfig<Model, Message>
  slowView?: SlowViewConfig<Model, Message>
  resources?: Layer.Layer<Resources>
  managedResources?: ManagedResources<Model, Message, ManagedResourceServices>
  title?: (model: Model) => string
}>

/** Configuration for terminal programs with flags. */
export type TerminalProgramConfigWithFlags<
  Model,
  Message,
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
  Flags,
  Resources = never,
  ManagedResourceServices = never,
> = TerminalProgramConfig<
  Model,
  Message,
  StreamDepsMap,
  Resources,
  ManagedResourceServices
> &
  Readonly<{
    Flags: Schema.Schema<Flags, any, never>
    flags: Effect.Effect<Flags>
    init: (
      flags: Flags,
    ) => readonly [
      Model,
      ReadonlyArray<
        Command<Message, never, Resources | ManagedResourceServices>
      >,
    ]
  }>

/** The init function type for terminal programs. */
export type TerminalProgramInit<
  Model,
  Message,
  Flags = void,
  Resources = never,
  ManagedResourceServices = never,
> = Flags extends void
  ? () => readonly [
      Model,
      ReadonlyArray<
        Command<Message, never, Resources | ManagedResourceServices>
      >,
    ]
  : (
      flags: Flags,
    ) => readonly [
      Model,
      ReadonlyArray<
        Command<Message, never, Resources | ManagedResourceServices>
      >,
    ]

type TerminalRuntimeConfig<
  Model,
  Message,
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
  Flags,
  Resources = never,
  ManagedResourceServices = never,
> = Readonly<{
  Model: Schema.Schema<Model, any, never>
  Flags: Schema.Schema<Flags, any, never>
  flags: Effect.Effect<Flags>
  init: (
    flags: Flags,
  ) => readonly [
    Model,
    ReadonlyArray<Command<Message, never, Resources | ManagedResourceServices>>,
  ]
  update: (
    model: Model,
    message: Message,
  ) => readonly [
    Model,
    ReadonlyArray<Command<Message, never, Resources | ManagedResourceServices>>,
  ]
  view: (model: Model) => TerminalView
  subscriptions?: Subscriptions<
    Model,
    Message,
    StreamDepsMap,
    Resources | ManagedResourceServices
  >
  crash?: TerminalCrashConfig<Model, Message>
  slowView?: SlowViewConfig<Model, Message>
  resources?: Layer.Layer<Resources>
  managedResources?: ManagedResources<Model, Message, ManagedResourceServices>
  title?: (model: Model) => string
}>

/** A configured terminal runtime, passed to `runTerminal` to start the application. */
export type MakeTerminalRuntimeReturn = () => Effect.Effect<void>

const makeTerminalRuntime = <
  Model,
  Message,
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
  Flags,
  Resources,
  ManagedResourceServices,
>({
  Model,
  flags: resolveFlags,
  init,
  update,
  view,
  subscriptions,
  crash,
  slowView,
  resources,
  managedResources,
  title,
}: TerminalRuntimeConfig<
  Model,
  Message,
  StreamDepsMap,
  Flags,
  Resources,
  ManagedResourceServices
>): MakeTerminalRuntimeReturn => {
  const resolvedSlowView = pipe(
    slowView ?? {},
    Option.liftPredicate(config => config !== false),
    Option.map(config => ({
      thresholdMs:
        typeof config === 'object' && 'thresholdMs' in config
          ? (config.thresholdMs ?? DEFAULT_SLOW_VIEW_THRESHOLD_MS)
          : DEFAULT_SLOW_VIEW_THRESHOLD_MS,
      onSlowView:
        typeof config === 'object' && 'onSlowView' in config
          ? (config.onSlowView ?? defaultSlowViewCallback)
          : defaultSlowViewCallback,
    })),
  )

  return (): Effect.Effect<void> =>
    Effect.scoped(
      Effect.gen(function* () {
        const target = createTarget()

        const maybeResourceLayer = resources
          ? Option.some(yield* Layer.memoize(resources))
          : Option.none()

        const managedResourceEntries: ReadonlyArray<
          [string, ManagedResourceConfig<Model, Message>]
        > = managedResources
          ? /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
            (Record.toEntries(managedResources) as ReadonlyArray<
              [string, ManagedResourceConfig<Model, Message>]
            >)
          : []

        const managedResourceRefs = yield* Effect.forEach(
          managedResourceEntries,
          ([_key, config]) =>
            Ref.make<Option.Option<unknown>>(Option.none()).pipe(
              Effect.map(ref => ({ config, ref })),
            ),
        )

        const mergeResourceIntoLayer = (
          layer: Layer.Layer<any>,
          { config, ref }: ManagedResourceRef,
        ) =>
          Layer.merge(
            layer,
            Layer.succeed(
              /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
              config.resource._tag as Context.Tag<any, any>,
              ref,
            ),
          )

        const maybeManagedResourceLayer = Array.match(managedResourceRefs, {
          onEmpty: () => Option.none(),
          onNonEmpty: refs =>
            Option.some(
              Array.reduce(
                refs,
                /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
                Layer.empty as Layer.Layer<any>,
                mergeResourceIntoLayer,
              ),
            ),
        })

        const provideAllResources = <A>(
          effect: Effect.Effect<A, never, Resources | ManagedResourceServices>,
        ): Effect.Effect<A> => {
          const withResources = Option.match(maybeResourceLayer, {
            onNone: () => effect,
            onSome: resourceLayer => Effect.provide(effect, resourceLayer),
          })

          return Option.match(maybeManagedResourceLayer, {
            /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
            onNone: () => withResources as Effect.Effect<A>,
            onSome: managedLayer =>
              /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
              Effect.provide(withResources, managedLayer) as Effect.Effect<A>,
          })
        }

        const flags = yield* resolveFlags

        const modelEquivalence = Schema.equivalence(Model)

        const messageQueue = yield* Queue.unbounded<Message>()
        const enqueueMessage = (message: Message) =>
          Queue.offer(messageQueue, message)

        const [initModel, initCommands] = init(flags)

        const modelSubscriptionRef = yield* SubscriptionRef.make(initModel)

        yield* Effect.forEach(
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
          initCommands as ReadonlyArray<
            AnyCommand<Message, never, Resources | ManagedResourceServices>
          >,
          command =>
            Effect.forkDaemon(
              command.effect.pipe(
                Effect.withSpan(command.name),
                provideAllResources,
                Effect.flatMap(enqueueMessage),
              ),
            ),
        )

        const modelRef = yield* Ref.make<Model>(initModel)

        const maybeCurrentRenderStateRef = yield* Ref.make<
          Option.Option<TerminalRenderState>
        >(Option.none())

        const currentMessageRef = yield* Ref.make<Option.Option<Message>>(
          Option.none(),
        )

        const maybeRuntimeRef = yield* Ref.make<
          Option.Option<Runtime.Runtime<never>>
        >(Option.none())

        const processMessage = (message: Message): Effect.Effect<void> =>
          Effect.gen(function* () {
            const currentModel = yield* Ref.get(modelRef)

            const [nextModel, commands] = update(currentModel, message)

            if (currentModel !== nextModel) {
              yield* Ref.set(modelRef, nextModel)
              yield* render(nextModel, Option.some(message))

              if (!modelEquivalence(currentModel, nextModel)) {
                yield* SubscriptionRef.set(modelSubscriptionRef, nextModel)
              }
            }

            yield* Effect.forEach(
              /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
              commands as ReadonlyArray<
                AnyCommand<Message, never, Resources | ManagedResourceServices>
              >,
              command =>
                Effect.forkDaemon(
                  command.effect.pipe(
                    Effect.withSpan(command.name),
                    provideAllResources,
                    Effect.flatMap(enqueueMessage),
                  ),
                ),
            )
          })

        const runProcessMessage =
          (message: Message, messageEffect: Effect.Effect<void>) =>
          (runtime: Runtime.Runtime<never>): void => {
            try {
              Runtime.runSync(runtime, messageEffect)
            } catch (error) {
              const squashed = Runtime.isFiberFailure(error)
                ? Cause.squash(error[Runtime.FiberFailureCauseId])
                : error

              const appError =
                squashed instanceof Error
                  ? squashed
                  : new Error(String(squashed))
              const model = Ref.get(modelRef).pipe(Effect.runSync)

              console.error('[foldkit] Application crash:', appError)

              if (crash?.report) {
                try {
                  crash.report({ error: appError, model, message })
                } catch (reportError) {
                  console.error('[foldkit] crash.report failed:', reportError)
                }
              }
            }
          }

        const dispatchSync = (message: unknown): void => {
          const maybeRuntime = Ref.get(maybeRuntimeRef).pipe(Effect.runSync)

          Option.match(maybeRuntime, {
            onNone: Function.constVoid,
            onSome: runProcessMessage(
              /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
              message as Message,
              /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
              processMessage(message as Message),
            ),
          })
        }

        const dispatchAsync = (message: unknown): Effect.Effect<void> =>
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
          enqueueMessage(message as Message)

        const render = (model: Model, message: Option.Option<Message>) =>
          Effect.gen(function* () {
            const viewStart = performance.now()
            const nextNode = yield* view(model)
            const viewDuration = performance.now() - viewStart

            Option.match(resolvedSlowView, {
              onNone: Function.constVoid,
              onSome: ({ thresholdMs, onSlowView }) => {
                if (viewDuration > thresholdMs) {
                  onSlowView({
                    model,
                    message,
                    durationMs: viewDuration,
                    thresholdMs,
                  })
                }
              },
            })

            const maybePreviousRenderState = yield* Ref.get(
              maybeCurrentRenderStateRef,
            )
            const nextRenderState = Terminal.render(
              maybePreviousRenderState,
              nextNode,
              target,
            )
            yield* Ref.set(
              maybeCurrentRenderStateRef,
              Option.some(nextRenderState),
            )

            if (title) {
              Terminal.setTitle(title(model))
            }
          }).pipe(
            Effect.provideService(Dispatch, {
              dispatchAsync,
              dispatchSync,
            }),
          )

        const runtime = yield* Effect.runtime()
        yield* Ref.set(maybeRuntimeRef, Option.some(runtime))

        yield* render(initModel, Option.none())

        if (subscriptions) {
          yield* pipe(
            subscriptions,
            Record.toEntries,
            Effect.forEach(
              ([
                _key,
                {
                  schema,
                  modelToDependencies,
                  equivalence: customEquivalence,
                  dependenciesToStream,
                },
              ]) => {
                let latestDependencies = modelToDependencies(initModel)
                const equivalence =
                  customEquivalence ?? Schema.equivalence(schema)

                const modelStream = Stream.concat(
                  Stream.make(initModel),
                  modelSubscriptionRef.changes,
                )

                return Effect.forkDaemon(
                  modelStream.pipe(
                    Stream.map(model => {
                      const dependencies = modelToDependencies(model)
                      latestDependencies = dependencies
                      return dependencies
                    }),
                    Stream.changesWith(equivalence),
                    Stream.flatMap(
                      dependencies =>
                        dependenciesToStream(
                          dependencies,
                          () => latestDependencies,
                        ),
                      { switch: true },
                    ),
                    Stream.runForEach(enqueueMessage),
                    provideAllResources,
                  ),
                )
              },
              {
                concurrency: 'unbounded',
                discard: true,
              },
            ),
          )
        }

        type ManagedResourceRef = (typeof managedResourceRefs)[number]

        const maybeRequirementsToLifecycle =
          (
            config: ManagedResourceConfig<Model, Message>,
            resourceRef: Ref.Ref<Option.Option<unknown>>,
          ) =>
          (
            maybeRequirements: unknown,
          ): Stream.Stream<Effect.Effect<Message, unknown>> => {
            if (
              Option.isOption(maybeRequirements) &&
              Option.isNone(maybeRequirements)
            ) {
              return Stream.empty
            }

            const requirements = Option.isOption(maybeRequirements)
              ? Option.getOrThrow(maybeRequirements)
              : maybeRequirements

            const acquire = Effect.gen(function* () {
              const value = yield* config.acquire(requirements)
              yield* Ref.set(resourceRef, Option.some(value))
              return value
            })

            const release = (value: unknown) =>
              Effect.gen(function* () {
                yield* config.release(value)
                yield* Ref.set(resourceRef, Option.none())
                yield* enqueueMessage(config.onReleased())
              }).pipe(Effect.catchAllCause(() => Effect.void))

            return pipe(
              Stream.scoped(Effect.acquireRelease(acquire, release)),
              Stream.flatMap(value =>
                Stream.concat(
                  Stream.make(config.onAcquired(value)),
                  Stream.never,
                ),
              ),
              Stream.map(Effect.succeed),
              Stream.catchAll(error =>
                Stream.make(Effect.succeed(config.onAcquireError(error))),
              ),
            )
          }

        const forkManagedResourceLifecycle = ({
          config,
          ref: resourceRef,
        }: ManagedResourceRef) =>
          Effect.gen(function* () {
            const modelStream = Stream.concat(
              Stream.make(initModel),
              modelSubscriptionRef.changes,
            )

            const equivalence = Schema.equivalence(config.schema)

            yield* Effect.forkDaemon(
              modelStream.pipe(
                Stream.map(config.modelToMaybeRequirements),
                Stream.changesWith(equivalence),
                Stream.flatMap(
                  maybeRequirementsToLifecycle(config, resourceRef),
                  { switch: true },
                ),
                Stream.runForEach(Effect.flatMap(enqueueMessage)),
              ),
            )
          })

        yield* Effect.forEach(
          managedResourceRefs,
          forkManagedResourceLifecycle,
          {
            concurrency: 'unbounded',
            discard: true,
          },
        )

        yield* pipe(
          Effect.forever(
            Effect.gen(function* () {
              const message = yield* Queue.take(messageQueue)
              yield* Ref.set(currentMessageRef, Option.some(message))
              yield* processMessage(message)
            }),
          ),
          Effect.catchAllCause(cause =>
            Effect.sync(() => {
              const squashed = Cause.squash(cause)
              const appError =
                squashed instanceof Error
                  ? squashed
                  : new Error(String(squashed))

              const model = Ref.get(modelRef).pipe(Effect.runSync)
              const message = Ref.get(currentMessageRef).pipe(
                Effect.runSync,
                Option.getOrThrow,
              )

              console.error('[foldkit] Application crash:', appError)

              if (crash?.report) {
                try {
                  crash.report({ error: appError, model, message })
                } catch (reportError) {
                  console.error('[foldkit] crash.report failed:', reportError)
                }
              }
            }),
          ),
        )
      }),
    )
}

/** Creates a Foldkit terminal program. */
export function makeTerminalProgram<
  Model,
  Message extends { _tag: string },
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
  Flags,
  Resources = never,
  ManagedResourceServices = never,
>(
  config: TerminalProgramConfigWithFlags<
    Model,
    Message,
    StreamDepsMap,
    Flags,
    Resources,
    ManagedResourceServices
  >,
): MakeTerminalRuntimeReturn

export function makeTerminalProgram<
  Model,
  Message extends { _tag: string },
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
  Resources = never,
  ManagedResourceServices = never,
>(
  config: TerminalProgramConfig<
    Model,
    Message,
    StreamDepsMap,
    Resources,
    ManagedResourceServices
  >,
): MakeTerminalRuntimeReturn

export function makeTerminalProgram<
  Model,
  Message extends { _tag: string },
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
  Flags,
  Resources = never,
  ManagedResourceServices = never,
>(
  config:
    | TerminalProgramConfigWithFlags<
        Model,
        Message,
        StreamDepsMap,
        Flags,
        Resources,
        ManagedResourceServices
      >
    | TerminalProgramConfig<
        Model,
        Message,
        StreamDepsMap,
        Resources,
        ManagedResourceServices
      >,
): MakeTerminalRuntimeReturn {
  const hasFlags = 'Flags' in config

  /* eslint-disable @typescript-eslint/consistent-type-assertions */
  if (hasFlags) {
    const flagsConfig = config as TerminalProgramConfigWithFlags<
      Model,
      Message,
      StreamDepsMap,
      Flags,
      Resources,
      ManagedResourceServices
    >
    return makeTerminalRuntime({
      ...config,
      Flags: flagsConfig.Flags,
      flags: flagsConfig.flags,
      init: flagsConfig.init,
    } as TerminalRuntimeConfig<
      Model,
      Message,
      StreamDepsMap,
      Flags,
      Resources,
      ManagedResourceServices
    >)
  }

  return makeTerminalRuntime({
    ...config,
    Flags: Schema.Void,
    flags: Effect.succeed(undefined),
    init: () =>
      (
        config as TerminalProgramConfig<
          Model,
          Message,
          StreamDepsMap,
          Resources,
          ManagedResourceServices
        >
      ).init(),
  } as TerminalRuntimeConfig<
    Model,
    Message,
    StreamDepsMap,
    void,
    Resources,
    ManagedResourceServices
  >)
  /* eslint-enable @typescript-eslint/consistent-type-assertions */
}

/** Starts a Foldkit terminal runtime. */
export const runTerminal = (
  terminalRuntime: MakeTerminalRuntimeReturn,
): void => {
  Terminal.runMain(terminalRuntime())
}
