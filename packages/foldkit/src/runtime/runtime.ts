import { BrowserRuntime } from '@effect/platform-browser'
import {
  Array,
  Cause,
  Context,
  Effect,
  Exit,
  Function,
  Layer,
  Match,
  Option,
  Predicate,
  PubSub,
  Queue,
  Record,
  Ref,
  Scheduler,
  Schema,
  Stream,
  SubscriptionRef,
  pipe,
} from 'effect'
import { h } from 'snabbdom'

import type { Command } from '../command/index.js'
import { createOverlay } from '../devTools/overlay.js'
import { type DevToolsStore, createDevToolsStore } from '../devTools/store.js'
import { startWebSocketBridge } from '../devTools/webSocketBridge.js'
import { Document } from '../html/index.js'
import { Url, fromString as urlFromString } from '../url/index.js'
import { VNode, patch, toVNode } from '../vdom.js'
import {
  addBfcacheRestoreListener,
  addNavigationEventListeners,
} from './browserListeners.js'
import { defaultCrashView, noOpDispatch } from './crashUI.js'
import { deepFreeze } from './deepFreeze.js'
import {
  PreserveModelMessage,
  RequestModelMessage,
  RestoreModelMessage,
} from './hmrProtocol.js'
import type {
  ManagedResourceConfig,
  ManagedResources,
} from './managedResource.js'
import type { Subscriptions } from './subscription.js'
import { UrlRequest } from './urlRequest.js'

type AnyCommand<T, E = never, R = never> = {
  readonly name: string
  readonly effect: Effect.Effect<T, E, R>
}

/** Position of the DevTools badge and panel on screen. */
export type DevToolsPosition =
  | 'BottomRight'
  | 'BottomLeft'
  | 'TopRight'
  | 'TopLeft'

/** Controls when a feature is shown. */
export type Visibility = 'Development' | 'Always'

/** Controls DevTools interaction mode.
 *
 * - `'Inspect'`: Messages stream in and clicking a row shows its state snapshot without pausing the app.
 * - `'TimeTravel'`: Clicking a row pauses the app at that historical state. Resume to continue.
 */
export type DevToolsMode = 'Inspect' | 'TimeTravel'

/**
 * DevTools configuration.
 *
 * Pass `false` to disable DevTools entirely.
 *
 * - `show`: `'Development'` (default) enables in dev mode only, `'Always'` enables in all environments including production.
 * - `position`: Where the badge and panel appear. Defaults to `'BottomRight'`.
 * - `mode`: `'TimeTravel'` (default) enables full time-travel debugging. `'Inspect'` allows browsing state snapshots without pausing the app.
 * - `banner`: Optional text shown as a banner at the top of the panel.
 */
export type DevToolsConfig =
  | false
  | Readonly<{
      show?: Visibility
      position?: DevToolsPosition
      mode?: DevToolsMode
      banner?: string
      /**
       * The application's `Message` Schema. When provided and the running app
       * is connected to the Foldkit DevTools MCP server, AI agents can dispatch
       * Messages into the runtime. The Schema decodes inbound dispatch payloads
       * at the bridge boundary and returns a clean error on mismatch.
       *
       * Without this field, `RequestDispatchMessage` is rejected with an
       * informative error.
       */
      Message?: Schema.Codec<any, any, unknown, unknown>
    }>

const DEFAULT_DEV_TOOLS_SHOW: Visibility = 'Development'
const DEFAULT_DEV_TOOLS_POSITION: DevToolsPosition = 'BottomRight'
const DEFAULT_DEV_TOOLS_MODE: DevToolsMode = 'TimeTravel'

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
        Predicate.isObject(message) && '_tag' in message
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
export class Dispatch extends Context.Service<
  Dispatch,
  {
    readonly dispatchAsync: (message: unknown) => Effect.Effect<void>
    readonly dispatchSync: (message: unknown) => void
  }
>()('@foldkit/Dispatch') {}

export type { Command } from '../command/index.js'

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
  view?: (context: CrashContext<Model, Message>) => Document
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
  Model: Schema.Codec<Model, any, unknown, unknown>
  Flags: Schema.Codec<Flags, any, unknown, unknown>
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
  view: (model: Model) => Document
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
   * Deep-freezes the Model after `init` and after every `update`, so accidental
   * mutations (e.g. `model.items.push(...)`) throw a `TypeError` at the exact
   * write site with a stack trace, rather than silently corrupting state or
   * breaking reference-equality change detection.
   *
   * Defaults to `true`. Activates only when Vite HMR is available, so production
   * builds pay nothing. Pass `false` to disable.
   *
   * Scope: only the Model is frozen. Messages are short-lived and are not
   * frozen.
   */
  freezeModel?: boolean
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
  devTools?: DevToolsConfig
}>

type BaseProgramConfig<
  Model,
  Message,
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
  Resources = never,
  ManagedResourceServices = never,
> = Readonly<{
  Model: Schema.Codec<Model, any, unknown, unknown>
  update: (
    model: Model,
    message: Message,
  ) => readonly [
    Model,
    ReadonlyArray<Command<Message, never, Resources | ManagedResourceServices>>,
  ]
  view: (model: Model) => Document
  subscriptions?: Subscriptions<
    Model,
    Message,
    StreamDepsMap,
    Resources | ManagedResourceServices
  >
  container: HTMLElement
  crash?: CrashConfig<Model, Message>
  slowView?: SlowViewConfig<Model, Message>
  freezeModel?: boolean
  resources?: Layer.Layer<Resources>
  managedResources?: ManagedResources<Model, Message, ManagedResourceServices>
  devTools?: DevToolsConfig
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
    Flags: Schema.Codec<Flags, any, unknown, unknown>
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
    Flags: Schema.Codec<Flags, any, unknown, unknown>
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
export type MakeRuntimeReturn = Readonly<{
  runtimeId: string
  start: (hmrModel?: unknown) => Effect.Effect<void>
}>

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
  freezeModel,
  resources,
  managedResources,
  devTools,
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

  const isFreezeModelActive = freezeModel !== false && !!import.meta.hot

  const maybeFreezeModel = (model: Model): Model =>
    isFreezeModelActive ? deepFreeze(model) : model

  const runtimeId = container?.id ?? ''

  // NOTE: When the message queue drains a chain of dispatches (e.g. recursive
  // Commands, websocket bursts), processing all of them inside one macrotask
  // blocks the browser from painting. Yield via MessageChannel once the
  // current burst exceeds FRAME_BUDGET_MS so the browser gets a frame.
  // setTimeout(0) is clamped to 4ms+; MessageChannel delivers in ~0.5ms.
  const FRAME_BUDGET_MS = 5

  const yieldToBrowser: Effect.Effect<void> = Effect.callback<void>(resume => {
    const channel = new MessageChannel()
    channel.port2.onmessage = () => resume(Effect.void)
    channel.port1.postMessage(null)
    return Effect.sync(() => channel.port2.close())
  })

  // NOTE: render coalescing relies on this firing once per frame. Multiple
  // Messages dispatched between frames all flag the renderLoop dirty; the
  // next rAF tick reads the latest model and renders once. Without this,
  // every Message would call render() inline, and during high-rate streams
  // (drag pointermove, websocket bursts) the runtime would paint each
  // intermediate frame with the cursor leading the rendered position.
  const awaitNextFrame: Effect.Effect<void> = Effect.callback<void>(resume => {
    const handle = requestAnimationFrame(() => resume(Effect.void))
    return Effect.sync(() => cancelAnimationFrame(handle))
  })

  const start = (hmrModel?: unknown): Effect.Effect<void> =>
    Effect.scoped(
      Effect.gen(function* () {
        if (runtimeId === '') {
          return yield* Effect.die(
            new Error(
              '[foldkit] Runtime container must have an `id` for HMR model preservation. ' +
                'Set `container.id = "app"` (or any unique string) before passing it to makeProgram.',
            ),
          )
        }
        const maybeResourceLayer = resources
          ? Option.some(resources)
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
              config.resource._tag as Context.Service<any, any>,
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

        const modelEquivalence = Schema.toEquivalence(Model)

        const ModelJsonCodec = Schema.toCodecJson(
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
          Model as Schema.Codec<Model>,
        )
        const decodeHmrModel = Schema.decodeUnknownExit(ModelJsonCodec)
        const encodeHmrModel = Schema.encodeUnknownSync(ModelJsonCodec)

        const messageQueue = yield* Queue.unbounded<Message>()
        const enqueueMessage = (message: Message) =>
          Queue.offer(messageQueue, message)

        const currentUrl: Option.Option<Url> = Option.fromNullishOr(
          routingConfig,
        ).pipe(Option.flatMap(() => urlFromString(window.location.href)))

        const [initModelRaw, initCommands] = Predicate.isNotUndefined(hmrModel)
          ? Exit.match(decodeHmrModel(hmrModel), {
              onFailure: () => init(flags, Option.getOrUndefined(currentUrl)),
              onSuccess: (
                restoredModel: Model,
              ): readonly [
                Model,
                ReadonlyArray<
                  AnyCommand<
                    Message,
                    never,
                    Resources | ManagedResourceServices
                  >
                >,
              ] => [restoredModel, []],
            })
          : init(flags, Option.getOrUndefined(currentUrl))

        const initModel = maybeFreezeModel(initModelRaw)

        const modelPubSub = yield* PubSub.unbounded<Model>()

        yield* Effect.forEach(
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
          initCommands as ReadonlyArray<
            AnyCommand<Message, never, Resources | ManagedResourceServices>
          >,
          command =>
            Effect.forkDetach(
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

        const maybeDevToolsStoreRef = yield* Ref.make<
          Option.Option<DevToolsStore>
        >(Option.none())

        const dispatchSync = (message: unknown): void => {
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
          Queue.offerUnsafe(messageQueue, message as Message)
        }

        const dispatchAsync = (message: unknown): Effect.Effect<void> =>
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
          enqueueMessage(message as Message)

        const dispatch = { dispatchAsync, dispatchSync }

        const isRenderPendingRef = yield* Ref.make(false)
        const lastDirtyMessageRef = yield* Ref.make<Option.Option<Message>>(
          Option.none(),
        )

        const isPausedEffect: Effect.Effect<boolean> = Effect.gen(function* () {
          const maybeStore = yield* Ref.get(maybeDevToolsStoreRef)
          return yield* Option.match(maybeStore, {
            onNone: () => Effect.succeed(false),
            onSome: ({ stateRef }) =>
              SubscriptionRef.get(stateRef).pipe(
                Effect.map(({ isPaused }) => isPaused),
              ),
          })
        })

        const processMessage = (message: Message): Effect.Effect<void> =>
          Effect.gen(function* () {
            const currentModel = yield* Ref.get(modelRef)

            const [nextModelRaw, commands] = update(currentModel, message)
            const nextModel = maybeFreezeModel(nextModelRaw)

            if (currentModel !== nextModel) {
              yield* Ref.set(modelRef, nextModel)
              yield* Ref.set(isRenderPendingRef, true)
              yield* Ref.set(lastDirtyMessageRef, Option.some(message))

              if (!modelEquivalence(currentModel, nextModel)) {
                PubSub.publishUnsafe(modelPubSub, nextModel)
                preserveModel(runtimeId, encodeHmrModel(nextModel))
              }
            }

            yield* Effect.forEach(
              /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
              commands as ReadonlyArray<
                AnyCommand<Message, never, Resources | ManagedResourceServices>
              >,
              command =>
                Effect.forkDetach(
                  command.effect.pipe(
                    Effect.withSpan(command.name),
                    provideAllResources,
                    Effect.flatMap(enqueueMessage),
                  ),
                ),
            )

            const maybeDevToolsStore = yield* Ref.get(maybeDevToolsStoreRef)
            yield* Option.match(maybeDevToolsStore, {
              onNone: () => Effect.void,
              onSome: store =>
                store.recordMessage(
                  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
                  message as Message & { _tag: string },
                  currentModel,
                  nextModel,
                  Array.map(
                    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
                    commands as ReadonlyArray<AnyCommand<Message>>,
                    command => command.name,
                  ),
                  currentModel !== nextModel,
                ),
            })
          })

        const render = (model: Model, message: Option.Option<Message>) =>
          Effect.gen(function* () {
            const viewStart = performance.now()
            const nextDocument = view(model)
            const nullableNextVNode = yield* nextDocument.body
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
              patchVNode(maybeCurrentVNode, nullableNextVNode, container),
            )
            yield* Ref.set(maybeCurrentVNodeRef, Option.some(patchedVNode))

            yield* Effect.sync(() =>
              applyDocumentMetadata(nextDocument, container),
            )
          }).pipe(Effect.provideService(Dispatch, dispatch))

        const isInIframe = window.self !== window.top
        const resolvedDevTools = pipe(
          devTools ?? {},
          Option.liftPredicate(config => config !== false),
          Option.filter(config =>
            Match.value(config.show ?? DEFAULT_DEV_TOOLS_SHOW).pipe(
              Match.when('Always', () => true),
              Match.when('Development', () => !!import.meta.hot && !isInIframe),
              Match.exhaustive,
            ),
          ),
          Option.map(config => ({
            position: config.position ?? DEFAULT_DEV_TOOLS_POSITION,
            mode: config.mode ?? DEFAULT_DEV_TOOLS_MODE,
            maybeBanner: Option.fromNullishOr(config.banner),
          })),
        )

        if (Option.isSome(resolvedDevTools)) {
          const { position, mode, maybeBanner } = resolvedDevTools.value
          const devToolsStore = yield* createDevToolsStore({
            replay: (model, message) => {
              /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
              const [updatedModel] = update(model as Model, message as Message)
              return maybeFreezeModel(updatedModel)
            },
            render: model =>
              /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
              render(model as Model, Option.none()),
            getCurrentModel: Ref.get(modelRef),
          })
          yield* Ref.set(maybeDevToolsStoreRef, Option.some(devToolsStore))
          yield* devToolsStore.recordInit(
            initModel,
            Array.map(initCommands, ({ name }) => name),
          )
          yield* createOverlay(devToolsStore, position, mode, maybeBanner)

          if (import.meta.hot) {
            const maybeMessageSchema =
              devTools !== undefined && devTools !== false
                ? Option.fromNullishOr(devTools.Message)
                : Option.none<Schema.Codec<any, any, unknown, unknown>>()
            yield* startWebSocketBridge(
              devToolsStore,
              import.meta.hot,
              /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
              message => enqueueMessage(message as Message),
              /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
              maybeMessageSchema as Option.Option<Schema.Codec<any, any>>,
            )
          }
        }

        yield* render(initModel, Option.none())

        // NOTE: lastDirtyMessageRef holds the most recent dirtying Message, so
        // slow-view callbacks during high-rate bursts attribute to the last
        // Message in the frame batch, not the specific one that pushed the
        // view past threshold. Acceptable for a debug callback; full
        // attribution would require correlating each message with its render
        // contribution, which isn't worth the complexity.
        const renderLoop = Effect.forever(
          Effect.gen(function* () {
            yield* awaitNextFrame

            const isPending = yield* Ref.get(isRenderPendingRef)
            if (!isPending) {
              return
            }

            const isPaused = yield* isPausedEffect
            if (isPaused) {
              return
            }

            yield* Ref.set(isRenderPendingRef, false)
            const model = yield* Ref.get(modelRef)
            const maybeMessage = yield* Ref.get(lastDirtyMessageRef)
            yield* render(model, maybeMessage)
          }),
        )

        yield* Effect.forkDetach(renderLoop)

        addBfcacheRestoreListener()

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
                  customEquivalence ?? Schema.toEquivalence(schema)

                const modelStream = Stream.concat(
                  Stream.make(initModel),
                  Stream.fromPubSub(modelPubSub),
                )

                return Effect.forkDetach(
                  modelStream.pipe(
                    // NOTE: updates latestDependencies on every model change so
                    // readDependencies() returns current values even when the
                    // stream hasn't restarted (when equivalence filters the change).
                    Stream.map(model => {
                      const dependencies = modelToDependencies(model)
                      latestDependencies = dependencies
                      return dependencies
                    }),
                    Stream.changesWith(equivalence),
                    Stream.switchMap(dependencies =>
                      dependenciesToStream(
                        dependencies,
                        () => latestDependencies,
                      ),
                    ),
                    Stream.runForEach(message =>
                      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
                      enqueueMessage(message as Message),
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
              }).pipe(Effect.catchCause(() => Effect.void))

            return pipe(
              Stream.scoped(
                Stream.fromEffect(Effect.acquireRelease(acquire, release)),
              ),
              Stream.flatMap(value =>
                Stream.concat(
                  Stream.make(config.onAcquired(value)),
                  Stream.never,
                ),
              ),
              Stream.map(Effect.succeed),
              Stream.catch(error =>
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
              Stream.fromPubSub(modelPubSub),
            )

            const equivalence = Schema.toEquivalence(config.schema)

            yield* Effect.forkDetach(
              modelStream.pipe(
                Stream.map(config.modelToMaybeRequirements),
                Stream.changesWith(equivalence),
                Stream.switchMap(
                  maybeRequirementsToLifecycle(config, resourceRef),
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

        const burstStartedAtRef = yield* Ref.make(0)

        const processWithBudget = (message: Message): Effect.Effect<void> =>
          Effect.gen(function* () {
            yield* Ref.set(currentMessageRef, Option.some(message))
            yield* processMessage(message)

            const burstStartedAt = yield* Ref.get(burstStartedAtRef)
            if (performance.now() - burstStartedAt < FRAME_BUDGET_MS) {
              return
            }

            yield* yieldToBrowser
            yield* Ref.set(burstStartedAtRef, performance.now())
          })

        const drainQueue: Effect.Effect<void> = Effect.gen(function* () {
          const batch = yield* Queue.takeAll(messageQueue)
          if (Array.isReadonlyArrayEmpty(batch)) {
            return
          }
          yield* Effect.forEach(batch, processWithBudget, { discard: true })
          yield* drainQueue
        })

        yield* pipe(
          Effect.forever(
            Effect.gen(function* () {
              const first = yield* Queue.take(messageQueue)
              yield* Ref.set(burstStartedAtRef, performance.now())
              yield* processWithBudget(first)
              yield* drainQueue
            }),
          ),
          Effect.catchCause(cause =>
            Effect.sync(() => {
              const squashed = Cause.squash(cause)
              const appError =
                squashed instanceof Error
                  ? squashed
                  : new Error(String(squashed))

              const model = Effect.runSync(Ref.get(modelRef))
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

  return { runtimeId, start }
}

const patchVNode = (
  maybeCurrentVNode: Option.Option<VNode>,
  nullableNextVNode: VNode | null,
  container: HTMLElement,
): VNode => {
  const nextVNode = Predicate.isNotNull(nullableNextVNode)
    ? nullableNextVNode
    : h('!')

  return Option.match(maybeCurrentVNode, {
    onNone: () => patch(toVNode(container), nextVNode),
    onSome: currentVNode => patch(currentVNode, nextVNode),
  })
}

const currentLocationUrl = (): string => {
  const { origin, pathname, search } = window.location
  return `${origin}${pathname}${search}`
}

const upsertHeadElement = <K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  selector: string,
  attributes: Readonly<Record<string, string>>,
): void => {
  const existing = document.head.querySelector(selector)
  const element =
    existing ?? document.head.appendChild(document.createElement(tagName))
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value)
  })
}

const applyDocumentMetadata = (
  nextDocument: Document,
  container: HTMLElement,
): void => {
  if (!document.body.contains(container)) {
    return
  }

  if (document.title !== nextDocument.title) {
    document.title = nextDocument.title
  }

  const canonical = nextDocument.canonical ?? currentLocationUrl()
  const ogUrl = nextDocument.ogUrl ?? canonical

  upsertHeadElement('link', 'link[rel="canonical"]', {
    rel: 'canonical',
    href: canonical,
  })
  upsertHeadElement('meta', 'meta[property="og:url"]', {
    property: 'og:url',
    content: ogUrl,
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
    const crashDocument = crash?.view
      ? crash.view(context)
      : defaultCrashView(context)

    const maybeCurrentVNode = Effect.runSync(Ref.get(maybeCurrentVNodeRef))

    const vnode = crashDocument.body.pipe(
      Effect.provideService(Dispatch, noOpDispatch),
      Effect.runSync,
    )

    patchVNode(maybeCurrentVNode, vnode, container)
    applyDocumentMetadata(crashDocument, container)
  } catch (viewError) {
    console.error('[foldkit] crash.view failed:', viewError)

    const maybeCurrentVNode = Effect.runSync(Ref.get(maybeCurrentVNodeRef))

    const fallbackViewError =
      viewError instanceof Error ? viewError : new Error(String(viewError))

    const fallbackDocument = defaultCrashView(context, fallbackViewError)
    const vnode = fallbackDocument.body.pipe(
      Effect.provideService(Dispatch, noOpDispatch),
      Effect.runSync,
    )

    patchVNode(maybeCurrentVNode, vnode, container)
    applyDocumentMetadata(fallbackDocument, container)
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
    ...(Predicate.isNotUndefined(config.freezeModel) && {
      freezeModel: config.freezeModel,
    }),
    ...(config.resources && { resources: config.resources }),
    ...(config.managedResources && {
      managedResources: config.managedResources,
    }),
    ...(Predicate.isNotUndefined(config.devTools) && {
      devTools: config.devTools,
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

const encodePreserveModelMessage =
  Schema.encodeUnknownSync(PreserveModelMessage)
const encodeRequestModelMessage = Schema.encodeUnknownSync(RequestModelMessage)
const decodeRestoreModelMessage = Schema.decodeUnknownExit(RestoreModelMessage)

const preserveModel = (id: string, model: unknown): void => {
  if (import.meta.hot) {
    import.meta.hot.send(
      'foldkit:preserve-model',
      encodePreserveModelMessage(PreserveModelMessage.make({ id, model })),
    )
  }
}

const PLUGIN_RESPONSE_TIMEOUT_MS = 500

// NOTE: scheduling fix for browser performance. Effect needs to defer work
// onto a future tick of the event loop. The default browser scheduler picks
// `setTimeout(f, 0)`, but browsers clamp `setTimeout` to a minimum of 4ms.
// `queueMicrotask` runs on the very next tick (sub-millisecond). Without this
// override, every dispatched message takes an extra 4-16ms round-trip,
// sharply visible on hover and drag.
const microtaskSetImmediate = (callback: () => void): (() => void) => {
  let cancelled = false
  queueMicrotask(() => {
    if (!cancelled) callback()
  })
  return () => {
    cancelled = true
  }
}

const browserScheduler = new Scheduler.MixedScheduler(
  'async',
  microtaskSetImmediate,
)

const provideBrowserScheduler = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
): Effect.Effect<A, E, R> =>
  Effect.provide(effect, Layer.succeed(Scheduler.Scheduler, browserScheduler))

/** Starts a Foldkit runtime, with HMR support for development. */
export const run = (program: MakeRuntimeReturn): void => {
  if (import.meta.hot) {
    const hot = import.meta.hot
    const { runtimeId, start } = program

    const requestPreservedModel = pipe(
      Effect.callback<unknown>(resume => {
        const handler = (message: unknown): void => {
          Exit.match(decodeRestoreModelMessage(message), {
            onFailure: Function.constVoid,
            onSuccess: ({ id, model }) => {
              if (id === runtimeId) {
                hot.off('foldkit:restore-model', handler)
                resume(Effect.succeed(model))
              }
            },
          })
        }
        hot.on('foldkit:restore-model', handler)
        hot.send(
          'foldkit:request-model',
          encodeRequestModelMessage(
            RequestModelMessage.make({ id: runtimeId }),
          ),
        )
        return Effect.sync(() => hot.off('foldkit:restore-model', handler))
      }),
      Effect.timeout(PLUGIN_RESPONSE_TIMEOUT_MS),
      Effect.catchTag('TimeoutError', () => {
        console.warn(
          '[foldkit] No response from @foldkit/vite-plugin. Add it to your vite.config.ts for HMR model preservation:\n\n' +
            "  import { foldkit } from '@foldkit/vite-plugin'\n\n" +
            '  export default defineConfig({ plugins: [foldkit()] })\n\n' +
            'Starting without HMR support.',
        )
        return Effect.succeed(undefined)
      }),
      Effect.flatMap(start),
    )

    BrowserRuntime.runMain(provideBrowserScheduler(requestPreservedModel))
  } else {
    BrowserRuntime.runMain(provideBrowserScheduler(program.start()))
  }
}
