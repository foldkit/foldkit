import { BrowserRuntime } from '@effect/platform-browser/index'
import {
  Array,
  Cause,
  Context,
  Effect,
  Either,
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
import { defaultErrorView, noOpDispatch } from './errorUI'
import type { ManagedResourceConfig, ManagedResources } from './managedResource'
import type { Subscriptions } from './subscription'
import { UrlRequest } from './urlRequest'

const SLOW_VIEW_THRESHOLD_MS = 16

/** Effect service tag that provides message dispatching to the view layer. */
export class Dispatch extends Context.Tag('@foldkit/Dispatch')<
  Dispatch,
  {
    readonly dispatchAsync: (message: unknown) => Effect.Effect<void>
    readonly dispatchSync: (message: unknown) => void
  }
>() {}

export type { Command } from '../command'

/** Configuration for browser URL integration with handlers for URL requests and URL changes. */
export type BrowserConfig<Message> = Readonly<{
  onUrlRequest: (request: UrlRequest) => Message
  onUrlChange: (url: Url) => Message
}>

/** Full runtime configuration including model schema, flags, init, update, view, and optional browser/stream config. */
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
  ) => [
    Model,
    ReadonlyArray<Command<Message, never, Resources | ManagedResourceServices>>,
  ]
  update: (
    model: Model,
    message: Message,
  ) => [
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
  browser?: BrowserConfig<Message>
  errorView?: (error: Error) => Html
  slowViewThresholdMs?: number | false
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
  devtools?: boolean
}>

type BaseElementConfig<
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
  ) => [
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
  errorView?: (error: Error) => Html
  slowViewThresholdMs?: number | false
  resources?: Layer.Layer<Resources>
  managedResources?: ManagedResources<Model, Message, ManagedResourceServices>
  devtools?: boolean
}>

/** Configuration for `makeElement` when the element receives initial data via flags. */
export type ElementConfigWithFlags<
  Model,
  Message,
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
  Flags,
  Resources = never,
  ManagedResourceServices = never,
> = BaseElementConfig<
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
    ) => [
      Model,
      ReadonlyArray<
        Command<Message, never, Resources | ManagedResourceServices>
      >,
    ]
  }>

/** Configuration for `makeElement` without flags. */
export type ElementConfigWithoutFlags<
  Model,
  Message,
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
  Resources = never,
  ManagedResourceServices = never,
> = BaseElementConfig<
  Model,
  Message,
  StreamDepsMap,
  Resources,
  ManagedResourceServices
> &
  Readonly<{
    init: () => [
      Model,
      ReadonlyArray<
        Command<Message, never, Resources | ManagedResourceServices>
      >,
    ]
  }>

type BaseApplicationConfig<
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
  ) => [
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
  browser: BrowserConfig<Message>
  errorView?: (error: Error) => Html
  slowViewThresholdMs?: number | false
  resources?: Layer.Layer<Resources>
  managedResources?: ManagedResources<Model, Message, ManagedResourceServices>
  devtools?: boolean
}>

/** Configuration for `makeApplication` when the application receives initial data via flags. */
export type ApplicationConfigWithFlags<
  Model,
  Message,
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
  Flags,
  Resources = never,
  ManagedResourceServices = never,
> = BaseApplicationConfig<
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
      url: Url,
    ) => [
      Model,
      ReadonlyArray<
        Command<Message, never, Resources | ManagedResourceServices>
      >,
    ]
  }>

/** Configuration for `makeApplication` without flags. */
export type ApplicationConfigWithoutFlags<
  Model,
  Message,
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
  Resources = never,
  ManagedResourceServices = never,
> = BaseApplicationConfig<
  Model,
  Message,
  StreamDepsMap,
  Resources,
  ManagedResourceServices
> &
  Readonly<{
    init: (
      url: Url,
    ) => [
      Model,
      ReadonlyArray<
        Command<Message, never, Resources | ManagedResourceServices>
      >,
    ]
  }>

/** The `init` function type for elements, with an optional `flags` parameter when `Flags` is not `void`. */
export type ElementInit<
  Model,
  Message,
  Flags = void,
  Resources = never,
  ManagedResourceServices = never,
> = Flags extends void
  ? () => [
      Model,
      ReadonlyArray<
        Command<Message, never, Resources | ManagedResourceServices>
      >,
    ]
  : (
      flags: Flags,
    ) => [
      Model,
      ReadonlyArray<
        Command<Message, never, Resources | ManagedResourceServices>
      >,
    ]

/** The `init` function type for applications, receives the current URL and optional flags. */
export type ApplicationInit<
  Model,
  Message,
  Flags = void,
  Resources = never,
  ManagedResourceServices = never,
> = Flags extends void
  ? (
      url: Url,
    ) => [
      Model,
      ReadonlyArray<
        Command<Message, never, Resources | ManagedResourceServices>
      >,
    ]
  : (
      flags: Flags,
      url: Url,
    ) => [
      Model,
      ReadonlyArray<
        Command<Message, never, Resources | ManagedResourceServices>
      >,
    ]

/** A configured Foldkit runtime returned by `makeElement` or `makeApplication`, passed to `run` to start the application. */
export type MakeRuntimeReturn = (hmrModel?: unknown) => Effect.Effect<void>

const makeRuntime =
  <
    Model,
    Message,
    StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
    Flags,
    Resources,
    ManagedResourceServices,
  >({
    Model,
    Flags: _Flags,
    flags: flags_,
    init,
    update,
    view,
    subscriptions,
    container,
    browser: browserConfig,
    errorView,
    slowViewThresholdMs = SLOW_VIEW_THRESHOLD_MS,
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
  >): MakeRuntimeReturn =>
  (hmrModel?: unknown): Effect.Effect<void> =>
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

        const flags = yield* flags_

        const modelEquivalence = Schema.equivalence(Model)

        const messageQueue = yield* Queue.unbounded<Message>()
        const enqueueMessage = (message: Message) =>
          Queue.offer(messageQueue, message)

        const currentUrl: Option.Option<Url> = Option.fromNullable(
          browserConfig,
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

        yield* Effect.forEach(initCommands, command =>
          Effect.forkDaemon(
            command.pipe(provideAllResources, Effect.flatMap(enqueueMessage)),
          ),
        )

        if (browserConfig) {
          addNavigationEventListeners(messageQueue, browserConfig)
        }

        const modelRef = yield* Ref.make<Model>(initModel)

        const maybeCurrentVNodeRef = yield* Ref.make<Option.Option<VNode>>(
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
                      pipe(
                        stateRef,
                        SubscriptionRef.get,
                        Effect.map(({ isPaused }) => isPaused),
                      ),
                  }),
                ),
              )

              if (!isPaused) {
                yield* render(nextModel)
              }

              if (!modelEquivalence(currentModel, nextModel)) {
                yield* SubscriptionRef.set(modelSubscriptionRef, nextModel)
                preserveModel(nextModel)
              }
            }

            yield* Effect.forEach(commands, command =>
              Effect.forkDaemon(
                command.pipe(
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
                  commands.length,
                  !modelEquivalence(currentModel, nextModel),
                ),
            })
          })

        const runProcessMessage =
          (messageEffect: Effect.Effect<void>) =>
          (runtime: Runtime.Runtime<never>): void => {
            try {
              Runtime.runSync(runtime)(messageEffect)
            } catch (error) {
              const squashed = Runtime.isFiberFailure(error)
                ? Cause.squash(error[Runtime.FiberFailureCauseId])
                : error

              const appError =
                squashed instanceof Error
                  ? squashed
                  : new Error(String(squashed))
              renderErrorView(
                appError,
                errorView,
                container,
                maybeCurrentVNodeRef,
              )
            }
          }

        const dispatchSync = (message: unknown): void => {
          const maybeRuntime = Effect.runSync(Ref.get(maybeRuntimeRef))

          Option.match(maybeRuntime, {
            onNone: Function.constVoid,
            onSome: runProcessMessage(
              /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
              processMessage(message as Message),
            ),
          })
        }

        const dispatchAsync = (message: unknown): Effect.Effect<void> =>
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
          enqueueMessage(message as Message)

        const render = (model: Model) =>
          Effect.gen(function* () {
            const viewStart = performance.now()
            const nextVNodeNullish = yield* view(model)
            const viewDuration = performance.now() - viewStart

            if (
              import.meta.hot &&
              slowViewThresholdMs !== false &&
              viewDuration > slowViewThresholdMs
            ) {
              console.warn(
                `[foldkit] Slow view: ${viewDuration.toFixed(1)}ms (budget: ${slowViewThresholdMs}ms). Consider moving computation to update or memoizing with createLazy.`,
              )
            }

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
        if (import.meta.hot && devtools !== false && !isInIframe) {
          const devtoolsStore = yield* createDevtoolsStore({
            replay: (model, message) =>
              /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
              Tuple.getFirst(update(model as Model, message as Message)),
            render: model =>
              /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
              render(model as Model),
            getCurrentModel: Ref.get(modelRef),
          })
          yield* Ref.set(maybeDevtoolsStoreRef, Option.some(devtoolsStore))
          yield* devtoolsStore.recordInit(initModel)
          yield* createOverlay(devtoolsStore)
        }

        yield* render(initModel)

        addBfcacheRestoreListener()

        if (subscriptions) {
          yield* pipe(
            subscriptions,
            Record.toEntries,
            Effect.forEach(
              ([_key, { schema, modelToDependencies, depsToStream }]) => {
                const modelStream = Stream.concat(
                  Stream.make(initModel),
                  modelSubscriptionRef.changes,
                )

                return Effect.forkDaemon(
                  modelStream.pipe(
                    Stream.map(modelToDependencies),
                    Stream.changesWith(Schema.equivalence(schema)),
                    Stream.flatMap(depsToStream, { switch: true }),
                    Stream.runForEach(command =>
                      command.pipe(Effect.flatMap(enqueueMessage)),
                    ),
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
              renderErrorView(
                appError,
                errorView,
                container,
                maybeCurrentVNodeRef,
              )
            }),
          ),
        )
      }),
    )

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

const renderErrorView = (
  appError: Error,
  errorView: ((error: Error) => Html) | undefined,
  container: HTMLElement,
  maybeCurrentVNodeRef: Ref.Ref<Option.Option<VNode>>,
): void => {
  console.error('[foldkit] Application error:', appError)

  try {
    const errorHtml = errorView
      ? errorView(appError)
      : defaultErrorView(appError)

    const maybeCurrentVNode = Ref.get(maybeCurrentVNodeRef).pipe(Effect.runSync)

    const vnode = errorHtml.pipe(
      Effect.provideService(Dispatch, noOpDispatch),
      Effect.runSync,
    )

    patchVNode(maybeCurrentVNode, vnode, container)
  } catch (viewError) {
    console.error('[foldkit] Custom errorView failed:', viewError)

    const maybeCurrentVNode = Ref.get(maybeCurrentVNodeRef).pipe(Effect.runSync)

    const fallbackViewError =
      viewError instanceof Error ? viewError : new Error(String(viewError))

    const vnode = defaultErrorView(appError, fallbackViewError).pipe(
      Effect.provideService(Dispatch, noOpDispatch),
      Effect.runSync,
    )

    patchVNode(maybeCurrentVNode, vnode, container)
  }
}

/** Creates a Foldkit element (no URL routing) and returns a runtime that can be passed to `run`. */
export function makeElement<
  Model,
  Message extends { _tag: string },
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
  Flags,
  Resources = never,
  ManagedResourceServices = never,
>(
  config: ElementConfigWithFlags<
    Model,
    Message,
    StreamDepsMap,
    Flags,
    Resources,
    ManagedResourceServices
  >,
): MakeRuntimeReturn

export function makeElement<
  Model,
  Message extends { _tag: string },
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
  Resources = never,
  ManagedResourceServices = never,
>(
  config: ElementConfigWithoutFlags<
    Model,
    Message,
    StreamDepsMap,
    Resources,
    ManagedResourceServices
  >,
): MakeRuntimeReturn

export function makeElement<
  Model,
  Message extends { _tag: string },
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
  Flags,
  Resources = never,
  ManagedResourceServices = never,
>(
  config:
    | ElementConfigWithFlags<
        Model,
        Message,
        StreamDepsMap,
        Flags,
        Resources,
        ManagedResourceServices
      >
    | ElementConfigWithoutFlags<
        Model,
        Message,
        StreamDepsMap,
        Resources,
        ManagedResourceServices
      >,
): MakeRuntimeReturn {
  const baseConfig = {
    Model: config.Model,
    update: config.update,
    view: config.view,
    ...(config.subscriptions && { subscriptions: config.subscriptions }),
    container: config.container,
    ...(config.errorView && { errorView: config.errorView }),
    ...(Predicate.isNotUndefined(config.slowViewThresholdMs) && {
      slowViewThresholdMs: config.slowViewThresholdMs,
    }),
    ...(config.resources && { resources: config.resources }),
    ...(config.managedResources && {
      managedResources: config.managedResources,
    }),
    ...(Predicate.isNotUndefined(config.devtools) && {
      devtools: config.devtools,
    }),
  }

  if ('Flags' in config) {
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    return makeRuntime({
      ...baseConfig,
      Flags: config.Flags,
      flags: config.flags,
      init: (flags: unknown) =>
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
        config.init(flags as Flags),
    } as RuntimeConfig<
      Model,
      Message,
      StreamDepsMap,
      Flags,
      Resources,
      ManagedResourceServices
    >)
  } else {
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    return makeRuntime({
      ...baseConfig,
      Flags: Schema.Void,
      flags: Effect.succeed(undefined),
      init: () => config.init(),
    } as RuntimeConfig<
      Model,
      Message,
      StreamDepsMap,
      void,
      Resources,
      ManagedResourceServices
    >)
  }
}

/** Creates a Foldkit application with URL routing and returns a runtime that can be passed to `run`. */
export function makeApplication<
  Model,
  Message extends { _tag: string },
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
  Flags,
  Resources = never,
  ManagedResourceServices = never,
>(
  config: ApplicationConfigWithFlags<
    Model,
    Message,
    StreamDepsMap,
    Flags,
    Resources,
    ManagedResourceServices
  >,
): MakeRuntimeReturn

export function makeApplication<
  Model,
  Message extends { _tag: string },
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
  Resources = never,
  ManagedResourceServices = never,
>(
  config: ApplicationConfigWithoutFlags<
    Model,
    Message,
    StreamDepsMap,
    Resources,
    ManagedResourceServices
  >,
): MakeRuntimeReturn

export function makeApplication<
  Model,
  Message extends { _tag: string },
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
  Flags,
  Resources = never,
  ManagedResourceServices = never,
>(
  config:
    | ApplicationConfigWithFlags<
        Model,
        Message,
        StreamDepsMap,
        Flags,
        Resources,
        ManagedResourceServices
      >
    | ApplicationConfigWithoutFlags<
        Model,
        Message,
        StreamDepsMap,
        Resources,
        ManagedResourceServices
      >,
): MakeRuntimeReturn {
  const currentUrl: Url = Option.getOrThrow(urlFromString(window.location.href))

  const baseConfig = {
    Model: config.Model,
    update: config.update,
    view: config.view,
    ...(config.subscriptions && { subscriptions: config.subscriptions }),
    container: config.container,
    browser: config.browser,
    ...(config.errorView && { errorView: config.errorView }),
    ...(Predicate.isNotUndefined(config.slowViewThresholdMs) && {
      slowViewThresholdMs: config.slowViewThresholdMs,
    }),
    ...(config.resources && { resources: config.resources }),
    ...(config.managedResources && {
      managedResources: config.managedResources,
    }),
    ...(Predicate.isNotUndefined(config.devtools) && {
      devtools: config.devtools,
    }),
  }

  if ('Flags' in config) {
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    return makeRuntime({
      ...baseConfig,
      Flags: config.Flags,
      flags: config.flags,
      init: (flags: unknown, url) =>
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
        config.init(flags as Flags, url ?? currentUrl),
    } as RuntimeConfig<
      Model,
      Message,
      StreamDepsMap,
      Flags,
      Resources,
      ManagedResourceServices
    >)
  } else {
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    return makeRuntime({
      ...baseConfig,
      Flags: Schema.Void,
      flags: Effect.succeed(undefined),
      init: (_flags, url) => config.init(url ?? currentUrl),
    } as RuntimeConfig<
      Model,
      Message,
      StreamDepsMap,
      void,
      Resources,
      ManagedResourceServices
    >)
  }
}

const preserveModel = (model: unknown): void => {
  if (import.meta.hot) {
    import.meta.hot.send('foldkit:preserve-model', model)
  }
}

/** Starts a Foldkit runtime, with HMR support for development. */
export const run = (foldkitRuntime: MakeRuntimeReturn): void => {
  if (import.meta.hot) {
    import.meta.hot.on('foldkit:restore-model', model => {
      BrowserRuntime.runMain(foldkitRuntime(model))
    })

    import.meta.hot.send('foldkit:request-model')
  } else {
    BrowserRuntime.runMain(foldkitRuntime())
  }
}
