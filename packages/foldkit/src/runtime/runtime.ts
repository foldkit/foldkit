import { BrowserRuntime } from '@effect/platform-browser/index'
import {
  Array,
  Cause,
  Context,
  Effect,
  Either,
  Function,
  Layer,
  Match,
  Option,
  Predicate,
  Queue,
  Record,
  Ref,
  Runtime,
  Schema,
  Stream,
  SubscriptionRef,
  Tuple,
  pipe,
} from 'effect'
import { h } from 'snabbdom'

import type { Command } from '../command'
import { createOverlay } from '../devtools/overlay'
import { type DevtoolsStore, createDevtoolsStore } from '../devtools/store'
import { Html } from '../html'
import { Url, fromString as urlFromString } from '../url'
import { VNode, patch, toVNode } from '../vdom'
import {
  addBfcacheRestoreListener,
  addNavigationEventListeners,
} from './browserListeners'
import { defaultCrashView, noOpDispatch } from './crashUI'
import type { ManagedResourceConfig, ManagedResources } from './managedResource'
import type { Subscriptions } from './subscription'
import { UrlRequest } from './urlRequest'

type AnyCommand<T, E = never, R = never> = {
  readonly name: string
  readonly effect: Effect.Effect<T, E, R>
}

/** Position of the devtools badge and panel on screen. */
export type DevtoolsPosition =
  | 'BottomRight'
  | 'BottomLeft'
  | 'TopRight'
  | 'TopLeft'

/** Controls when a feature is shown. */
export type Visibility = 'Development' | 'Always'

/** Controls devtools interaction mode.
 *
 * - `'Inspect'`: Messages stream in and clicking a row shows its state snapshot without pausing the app.
 * - `'TimeTravel'`: Clicking a row pauses the app at that historical state. Resume to continue.
 */
export type DevtoolsMode = 'Inspect' | 'TimeTravel'

/**
 * Devtools configuration.
 *
 * Pass `false` to disable devtools entirely.
 *
 * - `show`: `'Development'` (default) enables in dev mode only, `'Always'` enables in all environments including production.
 * - `position`: Where the badge and panel appear. Defaults to `'BottomRight'`.
 * - `mode`: `'TimeTravel'` (default) enables full time-travel debugging. `'Inspect'` allows browsing state snapshots without pausing the app.
 * - `banner`: Optional text shown as a banner at the top of the panel.
 */
export type DevtoolsConfig =
  | false
  | Readonly<{
      show?: Visibility
      position?: DevtoolsPosition
      mode?: DevtoolsMode
      banner?: string
    }>

const DEFAULT_DEVTOOLS_SHOW: Visibility = 'Development'
const DEFAULT_DEVTOOLS_POSITION: DevtoolsPosition = 'BottomRight'
const DEFAULT_DEVTOOLS_MODE: DevtoolsMode = 'TimeTravel'

/** Context provided to the slow view callback when a view exceeds the time budget. */
export type SlowViewContext<Model, Message> = Readonly<{
  model: Model
  message: Option.Option<Message>
  durationMs: number
  thresholdMs: number
}>

/**
 * Slow view warning configuration.
 *
 * Pass `false` to disable warnings entirely.
 *
 * - `show`: `'Development'` (default) enables in dev mode only, `'Always'` enables in all environments.
 * - `thresholdMs`: Duration in ms above which a view is considered slow. Defaults to 16 (one frame at 60fps).
 * - `onSlowView`: Custom callback invoked when a slow view is detected. Defaults to `console.warn`.
 */
export type SlowViewConfig<Model, Message> =
  | false
  | Readonly<{
      show?: Visibility
      thresholdMs?: number
      onSlowView?: (context: SlowViewContext<Model, Message>) => void
    }>

const DEFAULT_SLOW_VIEW_SHOW: Visibility = 'Development'
const DEFAULT_SLOW_VIEW_THRESHOLD_MS = 16

const defaultSlowViewCallback = (
  context: SlowViewContext<unknown, unknown>,
): void => {
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
    `[foldkit] Slow view: ${context.durationMs.toFixed(1)}ms (budget: ${context.thresholdMs}ms), triggered by ${trigger}. Consider moving computation to update or memoizing with createLazy.`,
    ...Option.toArray(context.message),
  )
}

/** Effect service tag that provides message dispatching to the view layer. */
export class Dispatch extends Context.Tag('@foldkit/Dispatch')<
  Dispatch,
  {
    readonly dispatchAsync: (message: unknown) => Effect.Effect<void>
    readonly dispatchSync: (message: unknown) => void
  }
>() {}

export type { Command } from '../command'

/** Configuration for URL routing with handlers for URL requests and URL changes. */
export type RoutingConfig<Message> = Readonly<{
  onUrlRequest: (request: UrlRequest) => Message
  onUrlChange: (url: Url) => Message
}>

/** Context provided to crash.view and crash.report when the runtime encounters an unrecoverable error. */
export type CrashContext<Model, Message> = Readonly<{
  error: Error
  model: Model
  message: Message
}>

/** Configuration for crash handling — custom crash UI and/or crash reporting. */
export type CrashConfig<Model, Message> = Readonly<{
  view?: (context: CrashContext<Model, Message>) => Html
  report?: (context: CrashContext<Model, Message>) => void
}>

/** Full runtime configuration including model schema, flags, init, update, view, and optional routing/stream config. */
type RuntimeConfig<
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
    url?: Url,
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
  view: (model: Model) => Html
  subscriptions?: Subscriptions<
    Model,
    Message,
    StreamDepsMap,
    Resources | ManagedResourceServices
  >
  container: HTMLElement
  routing?: RoutingConfig<Message>
  crash?: CrashConfig<Model, Message>
  slowView?: SlowViewConfig<Model, Message>
  /**
   * An Effect Layer providing long-lived resources that persist across command
   * invocations. Use this for browser resources with lifecycle (AudioContext,
   * RTCPeerConnection, CanvasRenderingContext2D) — not for stateless utilities
   * (HttpClient, JSON encoding) which should be provided per-command.
   *
   * The runtime memoizes the layer, ensuring a single shared instance for all
   * commands and subscriptions throughout the application's lifetime.
   */
  resources?: Layer.Layer<Resources>
  /**
   * Model-driven resources with acquire/release lifecycle. Unlike `resources`
   * which persist for the application's lifetime, managed resources are
   * acquired and released based on the current model state. Create with
   * `makeManagedResources`.
   */
  managedResources?: ManagedResources<Model, Message, ManagedResourceServices>
  devtools?: DevtoolsConfig
}>

type BaseProgramConfig<
  Model,
  Message,
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
  Resources = never,
  ManagedResourceServices = never,
> = Readonly<{
  Model: Schema.Schema<Model, any, never>
  update: (
    model: Model,
    message: Message,
  ) => readonly [
    Model,
    ReadonlyArray<Command<Message, never, Resources | ManagedResourceServices>>,
  ]
  view: (model: Model) => Html
  subscriptions?: Subscriptions<
    Model,
    Message,
    StreamDepsMap,
    Resources | ManagedResourceServices
  >
  container: HTMLElement
  crash?: CrashConfig<Model, Message>
  slowView?: SlowViewConfig<Model, Message>
  resources?: Layer.Layer<Resources>
  managedResources?: ManagedResources<Model, Message, ManagedResourceServices>
  devtools?: DevtoolsConfig
}>

/** Configuration for `makeProgram` with flags and URL routing. */
export type RoutingProgramConfigWithFlags<
  Model,
  Message,
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
  Flags,
  Resources = never,
  ManagedResourceServices = never,
> = BaseProgramConfig<
  Model,
  Message,
  StreamDepsMap,
  Resources,
  ManagedResourceServices
> &
  Readonly<{
    Flags: Schema.Schema<Flags, any, never>
    flags: Effect.Effect<Flags>
    routing: RoutingConfig<Message>
    init: (
      flags: Flags,
      url: Url,
    ) => readonly [
      Model,
      ReadonlyArray<
        Command<Message, never, Resources | ManagedResourceServices>
      >,
    ]
  }>

/** Configuration for `makeProgram` with URL routing but no flags. */
export type RoutingProgramConfig<
  Model,
  Message,
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
  Resources = never,
  ManagedResourceServices = never,
> = BaseProgramConfig<
  Model,
  Message,
  StreamDepsMap,
  Resources,
  ManagedResourceServices
> &
  Readonly<{
    routing: RoutingConfig<Message>
    init: (
      url: Url,
    ) => readonly [
      Model,
      ReadonlyArray<
        Command<Message, never, Resources | ManagedResourceServices>
      >,
    ]
  }>

/** Configuration for `makeProgram` with flags but no URL routing. */
export type ProgramConfigWithFlags<
  Model,
  Message,
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
  Flags,
  Resources = never,
  ManagedResourceServices = never,
> = BaseProgramConfig<
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

/** Configuration for `makeProgram` without flags or URL routing. */
export type ProgramConfig<
  Model,
  Message,
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
  Resources = never,
  ManagedResourceServices = never,
> = BaseProgramConfig<
  Model,
  Message,
  StreamDepsMap,
  Resources,
  ManagedResourceServices
> &
  Readonly<{
    init: () => readonly [
      Model,
      ReadonlyArray<
        Command<Message, never, Resources | ManagedResourceServices>
      >,
    ]
  }>

/** The `init` function type for programs without URL routing. */
export type ProgramInit<
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

/** The `init` function type for programs with URL routing, receives the current URL and optional flags. */
export type RoutingProgramInit<
  Model,
  Message,
  Flags = void,
  Resources = never,
  ManagedResourceServices = never,
> = Flags extends void
  ? (
      url: Url,
    ) => readonly [
      Model,
      ReadonlyArray<
        Command<Message, never, Resources | ManagedResourceServices>
      >,
    ]
  : (
      flags: Flags,
      url: Url,
    ) => readonly [
      Model,
      ReadonlyArray<
        Command<Message, never, Resources | ManagedResourceServices>
      >,
    ]

/** A configured Foldkit runtime returned by `makeProgram`, passed to `run` to start the application. */
export type MakeRuntimeReturn = (hmrModel?: unknown) => Effect.Effect<void>

const makeRuntime = <
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
  container,
  routing: routingConfig,
  crash,
  slowView,
  resources,
  managedResources,
  devtools,
}: RuntimeConfig<
  Model,
  Message,
  StreamDepsMap,
  Flags,
  Resources,
  ManagedResourceServices
>): MakeRuntimeReturn => {
  const resolvedSlowView = pipe(
    slowView ?? {},
    Option.liftPredicate(config => config !== false),
    Option.filter(config =>
      Match.value(config.show ?? DEFAULT_SLOW_VIEW_SHOW).pipe(
        Match.when('Always', () => true),
        Match.when('Development', () => !!import.meta.hot),
        Match.exhaustive,
      ),
    ),
    Option.map(config => ({
      thresholdMs: config.thresholdMs ?? DEFAULT_SLOW_VIEW_THRESHOLD_MS,
      onSlowView: config.onSlowView ?? defaultSlowViewCallback,
    })),
  )

  return (hmrModel?: unknown): Effect.Effect<void> =>
    Effect.scoped(
      Effect.gen(function* () {
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

        const currentUrl: Option.Option<Url> = Option.fromNullable(
          routingConfig,
        ).pipe(Option.flatMap(() => urlFromString(window.location.href)))

        const [initModel, initCommands] = Predicate.isNotUndefined(hmrModel)
          ? pipe(
              hmrModel,
              Schema.decodeUnknownEither(Model),
              Either.match({
                onLeft: () => init(flags, Option.getOrUndefined(currentUrl)),
                onRight: restoredModel => [restoredModel, []],
              }),
            )
          : init(flags, Option.getOrUndefined(currentUrl))

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

        if (routingConfig) {
          addNavigationEventListeners(messageQueue, routingConfig)
        }

        const modelRef = yield* Ref.make<Model>(initModel)

        const maybeCurrentVNodeRef = yield* Ref.make<Option.Option<VNode>>(
          Option.none(),
        )

        const currentMessageRef = yield* Ref.make<Option.Option<Message>>(
          Option.none(),
        )

        const maybeRuntimeRef = yield* Ref.make<
          Option.Option<Runtime.Runtime<never>>
        >(Option.none())

        const maybeDevtoolsStoreRef = yield* Ref.make<
          Option.Option<DevtoolsStore>
        >(Option.none())

        const processMessage = (message: Message): Effect.Effect<void> =>
          Effect.gen(function* () {
            const currentModel = yield* Ref.get(modelRef)

            const [nextModel, commands] = update(currentModel, message)

            if (currentModel !== nextModel) {
              yield* Ref.set(modelRef, nextModel)

              const isPaused = yield* pipe(
                maybeDevtoolsStoreRef,
                Ref.get,
                Effect.flatMap(
                  Option.match({
                    onNone: () => Effect.succeed(false),
                    onSome: ({ stateRef }) =>
                      SubscriptionRef.get(stateRef).pipe(
                        Effect.map(({ isPaused }) => isPaused),
                      ),
                  }),
                ),
              )

              if (!isPaused) {
                yield* render(nextModel, Option.some(message))
              }

              if (!modelEquivalence(currentModel, nextModel)) {
                yield* SubscriptionRef.set(modelSubscriptionRef, nextModel)
                preserveModel(nextModel)
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

            const maybeDevtoolsStore = yield* Ref.get(maybeDevtoolsStoreRef)
            yield* Option.match(maybeDevtoolsStore, {
              onNone: () => Effect.void,
              onSome: store =>
                store.recordMessage(
                  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
                  message as Message & { _tag: string },
                  nextModel,
                  Array.map(
                    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
                    commands as ReadonlyArray<AnyCommand<Message>>,
                    command => command.name,
                  ),
                  !modelEquivalence(currentModel, nextModel),
                ),
            })
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
              renderCrashView(
                { error: appError, model, message },
                crash,
                container,
                maybeCurrentVNodeRef,
              )
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
            const nextVNodeNullish = yield* view(model)
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

            const maybeCurrentVNode = yield* Ref.get(maybeCurrentVNodeRef)
            const patchedVNode = yield* Effect.sync(() =>
              patchVNode(maybeCurrentVNode, nextVNodeNullish, container),
            )
            yield* Ref.set(maybeCurrentVNodeRef, Option.some(patchedVNode))
          }).pipe(
            Effect.provideService(Dispatch, {
              dispatchAsync,
              dispatchSync,
            }),
          )

        const runtime = yield* Effect.runtime()
        yield* Ref.set(maybeRuntimeRef, Option.some(runtime))

        const isInIframe = window.self !== window.top
        const resolvedDevtools = pipe(
          devtools ?? {},
          Option.liftPredicate(config => config !== false),
          Option.filter(config =>
            Match.value(config.show ?? DEFAULT_DEVTOOLS_SHOW).pipe(
              Match.when('Always', () => true),
              Match.when('Development', () => !!import.meta.hot && !isInIframe),
              Match.exhaustive,
            ),
          ),
          Option.map(config => ({
            position: config.position ?? DEFAULT_DEVTOOLS_POSITION,
            mode: config.mode ?? DEFAULT_DEVTOOLS_MODE,
            maybeBanner: Option.fromNullable(config.banner),
          })),
        )

        if (Option.isSome(resolvedDevtools)) {
          const { position, mode, maybeBanner } = resolvedDevtools.value
          const devtoolsStore = yield* createDevtoolsStore({
            replay: (model, message) =>
              /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
              Tuple.getFirst(update(model as Model, message as Message)),
            render: model =>
              /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
              render(model as Model, Option.none()),
            getCurrentModel: Ref.get(modelRef),
          })
          yield* Ref.set(maybeDevtoolsStoreRef, Option.some(devtoolsStore))
          yield* devtoolsStore.recordInit(initModel)
          yield* createOverlay(devtoolsStore, position, mode, maybeBanner)
        }

        yield* render(initModel, Option.none())

        addBfcacheRestoreListener()

        if (subscriptions) {
          yield* pipe(
            subscriptions,
            Record.toEntries,
            Effect.forEach(
              ([
                _key,
                { schema, modelToDependencies, dependenciesToStream },
              ]) => {
                const modelStream = Stream.concat(
                  Stream.make(initModel),
                  modelSubscriptionRef.changes,
                )

                return Effect.forkDaemon(
                  modelStream.pipe(
                    Stream.map(modelToDependencies),
                    Stream.changesWith(Schema.equivalence(schema)),
                    Stream.flatMap(dependenciesToStream, { switch: true }),
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

        type ManagedResourceRef = (typeof managedResourceRefs)[number]

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
                  {
                    switch: true,
                  },
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
              renderCrashView(
                { error: appError, model, message },
                crash,
                container,
                maybeCurrentVNodeRef,
              )
            }),
          ),
        )
      }),
    )
}

const patchVNode = (
  maybeCurrentVNode: Option.Option<VNode>,
  nextVNodeNullish: VNode | null,
  container: HTMLElement,
): VNode => {
  const nextVNode = Predicate.isNotNull(nextVNodeNullish)
    ? nextVNodeNullish
    : h('!')

  return Option.match(maybeCurrentVNode, {
    onNone: () => patch(toVNode(container), nextVNode),
    onSome: currentVNode => patch(currentVNode, nextVNode),
  })
}

const renderCrashView = <Model, Message>(
  context: CrashContext<Model, Message>,
  crash: CrashConfig<Model, Message> | undefined,
  container: HTMLElement,
  maybeCurrentVNodeRef: Ref.Ref<Option.Option<VNode>>,
): void => {
  console.error('[foldkit] Application crash:', context.error)

  if (crash?.report) {
    try {
      crash.report(context)
    } catch (reportError) {
      console.error('[foldkit] crash.report failed:', reportError)
    }
  }

  try {
    const crashHtml = crash?.view
      ? crash.view(context)
      : defaultCrashView(context)

    const maybeCurrentVNode = Ref.get(maybeCurrentVNodeRef).pipe(Effect.runSync)

    const vnode = crashHtml.pipe(
      Effect.provideService(Dispatch, noOpDispatch),
      Effect.runSync,
    )

    patchVNode(maybeCurrentVNode, vnode, container)
  } catch (viewError) {
    console.error('[foldkit] crash.view failed:', viewError)

    const maybeCurrentVNode = Ref.get(maybeCurrentVNodeRef).pipe(Effect.runSync)

    const fallbackViewError =
      viewError instanceof Error ? viewError : new Error(String(viewError))

    const vnode = defaultCrashView(context, fallbackViewError).pipe(
      Effect.provideService(Dispatch, noOpDispatch),
      Effect.runSync,
    )

    patchVNode(maybeCurrentVNode, vnode, container)
  }
}

/** Creates a Foldkit program and returns a runtime that can be passed to `run`. Add a `routing` config for URL routing. */
export function makeProgram<
  Model,
  Message extends { _tag: string },
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
  Flags,
  Resources = never,
  ManagedResourceServices = never,
>(
  config: RoutingProgramConfigWithFlags<
    Model,
    Message,
    StreamDepsMap,
    Flags,
    Resources,
    ManagedResourceServices
  >,
): MakeRuntimeReturn

export function makeProgram<
  Model,
  Message extends { _tag: string },
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
  Resources = never,
  ManagedResourceServices = never,
>(
  config: RoutingProgramConfig<
    Model,
    Message,
    StreamDepsMap,
    Resources,
    ManagedResourceServices
  >,
): MakeRuntimeReturn

export function makeProgram<
  Model,
  Message extends { _tag: string },
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
  Flags,
  Resources = never,
  ManagedResourceServices = never,
>(
  config: ProgramConfigWithFlags<
    Model,
    Message,
    StreamDepsMap,
    Flags,
    Resources,
    ManagedResourceServices
  >,
): MakeRuntimeReturn

export function makeProgram<
  Model,
  Message extends { _tag: string },
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
  Resources = never,
  ManagedResourceServices = never,
>(
  config: ProgramConfig<
    Model,
    Message,
    StreamDepsMap,
    Resources,
    ManagedResourceServices
  >,
): MakeRuntimeReturn

export function makeProgram<
  Model,
  Message extends { _tag: string },
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
  Flags,
  Resources = never,
  ManagedResourceServices = never,
>(
  config:
    | RoutingProgramConfigWithFlags<
        Model,
        Message,
        StreamDepsMap,
        Flags,
        Resources,
        ManagedResourceServices
      >
    | RoutingProgramConfig<
        Model,
        Message,
        StreamDepsMap,
        Resources,
        ManagedResourceServices
      >
    | ProgramConfigWithFlags<
        Model,
        Message,
        StreamDepsMap,
        Flags,
        Resources,
        ManagedResourceServices
      >
    | ProgramConfig<
        Model,
        Message,
        StreamDepsMap,
        Resources,
        ManagedResourceServices
      >,
): MakeRuntimeReturn {
  const hasRouting = 'routing' in config
  const hasFlags = 'Flags' in config

  const currentUrl: Url | undefined = hasRouting
    ? Option.getOrThrow(urlFromString(window.location.href))
    : undefined

  const baseConfig = {
    Model: config.Model,
    update: config.update,
    view: config.view,
    ...(config.subscriptions && { subscriptions: config.subscriptions }),
    container: config.container,
    ...(hasRouting && { routing: config.routing }),
    ...(config.crash && { crash: config.crash }),
    ...(Predicate.isNotUndefined(config.slowView) && {
      slowView: config.slowView,
    }),
    ...(config.resources && { resources: config.resources }),
    ...(config.managedResources && {
      managedResources: config.managedResources,
    }),
    ...(Predicate.isNotUndefined(config.devtools) && {
      devtools: config.devtools,
    }),
  }

  /* eslint-disable @typescript-eslint/consistent-type-assertions */
  if (hasFlags && hasRouting) {
    return makeRuntime({
      ...baseConfig,
      Flags: config.Flags,
      flags: config.flags,
      init: (flags: unknown, url) =>
        (
          config as RoutingProgramConfigWithFlags<
            Model,
            Message,
            StreamDepsMap,
            Flags,
            Resources,
            ManagedResourceServices
          >
        ).init(flags as Flags, url ?? currentUrl!),
    } as RuntimeConfig<
      Model,
      Message,
      StreamDepsMap,
      Flags,
      Resources,
      ManagedResourceServices
    >)
  } else if (hasRouting) {
    return makeRuntime({
      ...baseConfig,
      Flags: Schema.Void,
      flags: Effect.succeed(undefined),
      init: (_flags, url) =>
        (
          config as RoutingProgramConfig<
            Model,
            Message,
            StreamDepsMap,
            Resources,
            ManagedResourceServices
          >
        ).init(url ?? currentUrl!),
    } as RuntimeConfig<
      Model,
      Message,
      StreamDepsMap,
      void,
      Resources,
      ManagedResourceServices
    >)
  } else if (hasFlags) {
    return makeRuntime({
      ...baseConfig,
      Flags: config.Flags,
      flags: config.flags,
      init: (flags: unknown) =>
        (
          config as ProgramConfigWithFlags<
            Model,
            Message,
            StreamDepsMap,
            Flags,
            Resources,
            ManagedResourceServices
          >
        ).init(flags as Flags),
    } as RuntimeConfig<
      Model,
      Message,
      StreamDepsMap,
      Flags,
      Resources,
      ManagedResourceServices
    >)
  } else {
    return makeRuntime({
      ...baseConfig,
      Flags: Schema.Void,
      flags: Effect.succeed(undefined),
      init: () =>
        (
          config as ProgramConfig<
            Model,
            Message,
            StreamDepsMap,
            Resources,
            ManagedResourceServices
          >
        ).init(),
    } as RuntimeConfig<
      Model,
      Message,
      StreamDepsMap,
      void,
      Resources,
      ManagedResourceServices
    >)
  }
  /* eslint-enable @typescript-eslint/consistent-type-assertions */
}

const preserveModel = (model: unknown): void => {
  if (import.meta.hot) {
    import.meta.hot.send('foldkit:preserve-model', model)
  }
}

const PLUGIN_RESPONSE_TIMEOUT_MS = 500

/** Starts a Foldkit runtime, with HMR support for development. */
export const run = (foldkitRuntime: MakeRuntimeReturn): void => {
  if (import.meta.hot) {
    const hot = import.meta.hot

    const requestPreservedModel = pipe(
      Effect.async<unknown>(resume => {
        hot.on('foldkit:restore-model', model => {
          resume(Effect.succeed(model))
        })
        hot.send('foldkit:request-model')
      }),
      Effect.timeoutTo({
        onTimeout: () => {
          console.warn(
            '[foldkit] No response from vite-plugin-foldkit. Add it to your vite.config.ts for HMR model preservation:\n\n' +
              "  import foldkit from 'vite-plugin-foldkit'\n\n" +
              '  export default defineConfig({ plugins: [foldkit()] })\n\n' +
              'Starting without HMR support.',
          )
          return undefined
        },
        onSuccess: Function.identity,
        duration: PLUGIN_RESPONSE_TIMEOUT_MS,
      }),
      Effect.flatMap(foldkitRuntime),
    )

    BrowserRuntime.runMain(requestPreservedModel)
  } else {
    BrowserRuntime.runMain(foldkitRuntime())
  }
}
