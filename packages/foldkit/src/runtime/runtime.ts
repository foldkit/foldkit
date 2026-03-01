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
  pipe,
} from 'effect'
import { h } from 'snabbdom'

import type { Command } from '../command'
import { Html } from '../html'
import type { ManagedResource } from '../managedResource'
import { Url, fromString as urlFromString } from '../url'
import { VNode, patch, toVNode } from '../vdom'
import {
  addBfcacheRestoreListener,
  addNavigationEventListeners,
} from './browserListeners'
import { defaultErrorView, noOpDispatch } from './errorUI'
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
export type BrowserConfig<Message> = {
  readonly onUrlRequest: (request: UrlRequest) => Message
  readonly onUrlChange: (url: Url) => Message
}

/** Full runtime configuration including model schema, flags, init, update, view, and optional browser/stream config. */
export interface RuntimeConfig<
  Model,
  Message,
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
  Flags,
  Resources = never,
  ManagedResourceServices = never,
> {
  Model: Schema.Schema<Model, any, never>
  Flags: Schema.Schema<Flags, any, never>
  readonly flags: Effect.Effect<Flags>
  readonly init: (
    flags: Flags,
    url?: Url,
  ) => [
    Model,
    ReadonlyArray<Command<Message, never, Resources | ManagedResourceServices>>,
  ]
  readonly update: (
    model: Model,
    message: Message,
  ) => [
    Model,
    ReadonlyArray<Command<Message, never, Resources | ManagedResourceServices>>,
  ]
  readonly view: (model: Model) => Html
  readonly subscriptions?: Subscriptions<
    Model,
    Message,
    StreamDepsMap,
    Resources | ManagedResourceServices
  >
  readonly container: HTMLElement
  readonly browser?: BrowserConfig<Message>
  readonly errorView?: (error: Error) => Html
  readonly slowViewThresholdMs?: number | false
  /**
   * An Effect Layer providing long-lived resources that persist across command
   * invocations. Use this for browser resources with lifecycle (AudioContext,
   * RTCPeerConnection, CanvasRenderingContext2D) — not for stateless utilities
   * (HttpClient, JSON encoding) which should be provided per-command.
   *
   * The runtime memoizes the layer, ensuring a single shared instance for all
   * commands and subscriptions throughout the application's lifetime.
   */
  readonly resources?: Layer.Layer<Resources>
  /**
   * Model-driven resources with acquire/release lifecycle. Unlike `resources`
   * which persist for the application's lifetime, managed resources are
   * acquired and released based on the current model state. Create with
   * `makeManagedResources`.
   */
  readonly managedResources?: ManagedResources<
    Model,
    Message,
    ManagedResourceServices
  >
}

interface BaseElementConfig<
  Model,
  Message,
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
  Resources = never,
  ManagedResourceServices = never,
> {
  readonly Model: Schema.Schema<Model, any, never>
  readonly update: (
    model: Model,
    message: Message,
  ) => [
    Model,
    ReadonlyArray<Command<Message, never, Resources | ManagedResourceServices>>,
  ]
  readonly view: (model: Model) => Html
  readonly subscriptions?: Subscriptions<
    Model,
    Message,
    StreamDepsMap,
    Resources | ManagedResourceServices
  >
  readonly container: HTMLElement
  readonly errorView?: (error: Error) => Html
  readonly slowViewThresholdMs?: number | false
  readonly resources?: Layer.Layer<Resources>
  readonly managedResources?: ManagedResources<
    Model,
    Message,
    ManagedResourceServices
  >
}

/** Configuration for `makeElement` when the element receives initial data via flags. */
export interface ElementConfigWithFlags<
  Model,
  Message,
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
  Flags,
  Resources = never,
  ManagedResourceServices = never,
> extends BaseElementConfig<
  Model,
  Message,
  StreamDepsMap,
  Resources,
  ManagedResourceServices
> {
  readonly Flags: Schema.Schema<Flags, any, never>
  readonly flags: Effect.Effect<Flags>
  readonly init: (
    flags: Flags,
  ) => [
    Model,
    ReadonlyArray<Command<Message, never, Resources | ManagedResourceServices>>,
  ]
}

/** Configuration for `makeElement` without flags. */
export interface ElementConfigWithoutFlags<
  Model,
  Message,
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
  Resources = never,
  ManagedResourceServices = never,
> extends BaseElementConfig<
  Model,
  Message,
  StreamDepsMap,
  Resources,
  ManagedResourceServices
> {
  readonly init: () => [
    Model,
    ReadonlyArray<Command<Message, never, Resources | ManagedResourceServices>>,
  ]
}

interface BaseApplicationConfig<
  Model,
  Message,
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
  Resources = never,
  ManagedResourceServices = never,
> {
  readonly Model: Schema.Schema<Model, any, never>
  readonly update: (
    model: Model,
    message: Message,
  ) => [
    Model,
    ReadonlyArray<Command<Message, never, Resources | ManagedResourceServices>>,
  ]
  readonly view: (model: Model) => Html
  readonly subscriptions?: Subscriptions<
    Model,
    Message,
    StreamDepsMap,
    Resources | ManagedResourceServices
  >
  readonly container: HTMLElement
  readonly browser: BrowserConfig<Message>
  readonly errorView?: (error: Error) => Html
  readonly slowViewThresholdMs?: number | false
  readonly resources?: Layer.Layer<Resources>
  readonly managedResources?: ManagedResources<
    Model,
    Message,
    ManagedResourceServices
  >
}

/** Configuration for `makeApplication` when the application receives initial data via flags. */
export interface ApplicationConfigWithFlags<
  Model,
  Message,
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
  Flags,
  Resources = never,
  ManagedResourceServices = never,
> extends BaseApplicationConfig<
  Model,
  Message,
  StreamDepsMap,
  Resources,
  ManagedResourceServices
> {
  readonly Flags: Schema.Schema<Flags, any, never>
  readonly flags: Effect.Effect<Flags>
  readonly init: (
    flags: Flags,
    url: Url,
  ) => [
    Model,
    ReadonlyArray<Command<Message, never, Resources | ManagedResourceServices>>,
  ]
}

/** Configuration for `makeApplication` without flags. */
export interface ApplicationConfigWithoutFlags<
  Model,
  Message,
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
  Resources = never,
  ManagedResourceServices = never,
> extends BaseApplicationConfig<
  Model,
  Message,
  StreamDepsMap,
  Resources,
  ManagedResourceServices
> {
  readonly init: (
    url: Url,
  ) => [
    Model,
    ReadonlyArray<Command<Message, never, Resources | ManagedResourceServices>>,
  ]
}

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

/** A reactive binding between model state and a long-running stream of commands. */
export type Subscription<Model, Message, StreamDeps, Resources = never> = {
  readonly modelToDependencies: (model: Model) => StreamDeps
  readonly depsToStream: (
    deps: StreamDeps,
  ) => Stream.Stream<Command<Message, never, Resources>, never, Resources>
}

type SubscriptionConfig<Model, Message, StreamDeps, Resources = never> = {
  readonly schema: Schema.Schema<StreamDeps>
} & Subscription<Model, Message, StreamDeps, Resources>

/** A record of named subscription configurations, keyed by dependency field name. */
export type Subscriptions<
  Model,
  Message,
  SubscriptionDeps extends Schema.Struct<any>,
  Resources = never,
> = {
  readonly [K in keyof Schema.Schema.Type<SubscriptionDeps>]: SubscriptionConfig<
    Model,
    Message,
    Schema.Schema.Type<SubscriptionDeps>[K],
    Resources
  >
}

/** Creates type-safe subscription configurations from a dependency schema. */
export const makeSubscriptions =
  <SubscriptionDeps extends Schema.Struct<any>>(
    SubscriptionDeps: SubscriptionDeps,
  ) =>
  <Model, Message, Resources = never>(configs: {
    [K in keyof Schema.Schema.Type<SubscriptionDeps>]: {
      modelToDependencies: (
        model: Model,
      ) => Schema.Schema.Type<SubscriptionDeps>[K]
      depsToStream: (
        deps: Schema.Schema.Type<SubscriptionDeps>[K],
      ) => Stream.Stream<Command<Message, never, Resources>, never, Resources>
    }
  }) =>
    Record.map(configs, ({ modelToDependencies, depsToStream }, key) => ({
      schema: SubscriptionDeps.fields[key],
      modelToDependencies,
      depsToStream,
    }))

/** Internal configuration for a single managed resource, used by the runtime. */
export type ManagedResourceConfig<Model, Message> = {
  readonly schema: Schema.Schema<any>
  readonly resource: ManagedResource<any>
  readonly modelToMaybeRequirements: (model: Model) => unknown
  readonly acquire: (params: unknown) => Effect.Effect<unknown, unknown>
  readonly release: (value: unknown) => Effect.Effect<void>
  readonly onAcquired: (value: unknown) => Message
  readonly onReleased: () => Message
  readonly onAcquireError: (error: unknown) => Message
}

declare const ManagedResourceServicesPhantom: unique symbol

/** A record of named managed resource configurations, keyed by dependency field name. */
export type ManagedResources<Model, Message, Services = never> = Record<
  string,
  ManagedResourceConfig<Model, Message>
> & {
  readonly [ManagedResourceServicesPhantom]?: Services
}

/** Type-level utility to extract the service union from a ManagedResources type. */
export type ManagedResourceServicesOf<MR> =
  MR extends ManagedResources<any, any, infer S> ? S : never

/**
 * Creates type-safe managed resource configurations from a dependency schema.
 *
 * Use this when a resource is expensive or stateful and should only exist while
 * the model is in a particular state — a camera stream during a video call, a
 * WebSocket connection while on a chat page, or a Web Worker pool during a
 * computation. For resources that live for the entire application lifetime, use
 * the static `resources` config instead.
 *
 * **Lifecycle** — The runtime watches each config's `modelToMaybeRequirements`
 * after every model update, structurally comparing the result against the
 * previous value:
 *
 * - `Option.none()` → `Option.some(params)`: calls `acquire(params)`, then
 *   dispatches `onAcquired(value)`.
 * - `Option.some(paramsA)` → `Option.some(paramsB)` (structurally different):
 *   releases the old resource, then acquires a new one with `paramsB`.
 * - `Option.some(params)` → `Option.none()`: calls `release(value)`, then
 *   dispatches `onReleased()`. No re-acquisition occurs.
 *
 * If `acquire` fails, `onAcquireError` is dispatched and the resource daemon
 * continues watching for the next deps change — a failed acquisition does not
 * crash the application.
 *
 * **Config fields:**
 *
 * - `resource` — The identity tag created with `ManagedResource.tag`. Appears
 *   in the Effect R channel so commands that call `.get` are type-checked.
 * - `modelToMaybeRequirements` — Extracts requirements from the model.
 *   `Option.none()` means "release", `Option.some(params)` means
 *   "acquire/re-acquire if params changed". For resources with no
 *   parameters, use `S.Option(S.Null)` and return `Option.some(null)` —
 *   not `S.Struct({})`, which has no fields for equivalence comparison.
 * - `acquire` — Creates the resource from the unwrapped params. The returned
 *   Effect should fail when acquisition fails — errors in the error channel
 *   flow to `onAcquireError` as a message instead of crashing the runtime.
 * - `release` — Tears down the resource. Errors thrown here are silently
 *   swallowed — release must not block cleanup.
 * - `onAcquired` — Message dispatched when `acquire` succeeds.
 * - `onAcquireError` — Message dispatched when `acquire` fails.
 * - `onReleased` — Message dispatched after `release` completes.
 *
 * @example
 * ```ts
 * const CameraStream = ManagedResource.tag<MediaStream>()('CameraStream')
 *
 * const ManagedResourceDeps = S.Struct({
 *   camera: S.Option(S.Struct({ facingMode: S.String })),
 * })
 *
 * const managedResources = Runtime.makeManagedResources(
 *   ManagedResourceDeps,
 * )<Model, Message>({
 *   camera: {
 *     resource: CameraStream,
 *     modelToMaybeRequirements: model =>
 *       pipe(
 *         model.callState,
 *         Option.liftPredicate(
 *           (callState): callState is typeof InCall.Type =>
 *             callState._tag === 'InCall',
 *         ),
 *         Option.map(callState => ({ facingMode: callState.facingMode })),
 *       ),
 *     acquire: ({ facingMode }) =>
 *       Effect.tryPromise(() =>
 *         navigator.mediaDevices.getUserMedia({ video: { facingMode } }),
 *       ),
 *     release: stream =>
 *       Effect.sync(() => stream.getTracks().forEach(track => track.stop())),
 *     onAcquired: () => AcquiredCamera(),
 *     onAcquireError: error => FailedToAcquireCamera({ error: String(error) }),
 *     onReleased: () => ReleasedCamera(),
 *   },
 * })
 * ```
 *
 * @param ManagedResourceDeps - An Effect Schema struct where each field's type
 * drives the requirements for one managed resource. Wrap in `S.Option(...)` for
 * resources that can be released (most cases).
 *
 * @see {@link ManagedResource.tag} for creating the resource identity.
 */
export const makeManagedResources =
  <ManagedResourceDeps extends Schema.Struct<any>>(
    ManagedResourceDeps: ManagedResourceDeps,
  ) =>
  <Model, Message>(configs: {
    [K in keyof Schema.Schema.Type<ManagedResourceDeps>]: {
      readonly resource: ManagedResource<any, any>
      readonly modelToMaybeRequirements: (
        model: Model,
      ) => Schema.Schema.Type<ManagedResourceDeps>[K]
      readonly acquire: (
        params: Schema.Schema.Type<ManagedResourceDeps>[K] extends Option.Option<
          infer P
        >
          ? P
          : Schema.Schema.Type<ManagedResourceDeps>[K],
      ) => Effect.Effect<any, unknown>
      readonly release: (value: any) => Effect.Effect<void>
      readonly onAcquired: (value: any) => Message
      readonly onReleased: () => Message
      readonly onAcquireError: (error: unknown) => Message
    }
  }): ManagedResources<Model, Message> =>
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    Record.map(
      configs,
      (config, key) =>
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
        ({
          schema: ManagedResourceDeps.fields[key],
          ...config,
        }) as ManagedResourceConfig<Model, Message>,
    ) as ManagedResources<Model, Message>

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

        const processMessage = (message: Message): Effect.Effect<void> =>
          Effect.gen(function* () {
            const currentModel = yield* Ref.get(modelRef)

            const [nextModel, commands] = update(currentModel, message)

            yield* Ref.set(modelRef, nextModel)
            yield* render(nextModel)

            if (!modelEquivalence(currentModel, nextModel)) {
              yield* SubscriptionRef.set(modelSubscriptionRef, nextModel)
              preserveModel(nextModel)
            }

            yield* Effect.forEach(commands, command =>
              Effect.forkDaemon(
                command.pipe(
                  provideAllResources,
                  Effect.flatMap(enqueueMessage),
                ),
              ),
            )
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
