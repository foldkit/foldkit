import { BrowserRuntime } from '@effect/platform-browser'
import {
  Array,
  Cause,
  Context,
  Duration,
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
import {
  type CommandRecord,
  type DevToolsStore,
  type MountRecord,
  createDevToolsStore,
} from '../devTools/store.js'
import { startWebSocketBridge } from '../devTools/webSocketBridge.js'
import {
  type BoundaryRegistry,
  Document,
  Html,
  __beginRender as beginHtmlRender,
  __clearRuntime as clearHtmlRuntime,
  __createBoundaryRegistry as createHtmlBoundaryRegistry,
  __setRuntime as setHtmlRuntime,
} from '../html/index.js'
import { MountTracker } from '../mount/index.js'
import { UrlRequest } from '../navigation/urlRequest.js'
import { Url, fromString as urlFromString } from '../url/index.js'
import { VNode, dedupeSharedVNodes, patch, toVNode } from '../vdom.js'
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
import { type EnvelopedMessage, orderByPriority } from './messagePriority.js'
import { makePreserveScheduler } from './preserveScheduler.js'
import { makeRenderLoop } from './renderLoop.js'
import type { Subscriptions } from './subscription.js'

type AnyCommand<T, E = never, R = never> = {
  readonly name: string
  readonly args?: Record<string, unknown>
  readonly effect: Effect.Effect<T, E, R>
}

const toCommandRecord = (
  command: Readonly<{ name: string; args?: Record<string, unknown> }>,
): CommandRecord =>
  command.args !== undefined
    ? { name: command.name, args: command.args }
    : { name: command.name }

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

/** Mode value for the DevTools panel. Either a single mode used in every
 *  environment, or an object selecting different modes for development and
 *  production. Use the object form to keep `'TimeTravel'` for local debugging
 *  while shipping the safer `'Inspect'` mode to users. `'TimeTravel'` in
 *  production pauses the user's app when a history row is clicked. */
export type DevToolsModeConfig =
  | DevToolsMode
  | Readonly<{ development: DevToolsMode; production: DevToolsMode }>

/**
 * DevTools configuration.
 *
 * Pass `false` to disable DevTools entirely.
 *
 * - `show`: `'Development'` (default) enables in dev mode only, `'Always'` enables in all environments including production.
 * - `position`: Where the badge and panel appear. Defaults to `'BottomRight'`.
 * - `mode`: `'TimeTravel'` (default) enables full time-travel debugging. `'Inspect'` allows browsing state snapshots without pausing the app. Pass `{ development, production }` to use different modes per environment. Useful when DevTools is shown in production (`show: 'Always'`) and you want `'TimeTravel'` only in local development.
 * - `banner`: Optional text shown as a banner at the top of the panel.
 * - `excludeFromHistory`: Message `_tag` values whose dispatches should not be recorded in DevTools history. The Messages still drive `update` and the runtime as usual; they just don't appear in the history panel and don't pay the per-Message diff cost. Use for high-frequency Messages (animation frames, pointer moves, scroll events) that would flood history without adding insight.
 * - `maxEntries`: Maximum number of recorded Messages retained in history before the oldest is evicted. Defaults to 100. Clamped to the range 20-500: smaller values keep the panel snappy under high message rates, larger values give you more scroll-back. Each retained entry stores a full Model snapshot, so memory cost scales linearly with both `maxEntries` and your Model size.
 */
export type DevToolsConfig =
  | false
  | Readonly<{
      show?: Visibility
      position?: DevToolsPosition
      mode?: DevToolsModeConfig
      banner?: string
      excludeFromHistory?: ReadonlyArray<string>
      maxEntries?: number
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

const resolveDevToolsMode = (config: DevToolsModeConfig): DevToolsMode => {
  if (typeof config === 'string') {
    return config
  } else {
    return import.meta.hot ? config.development : config.production
  }
}
const DEV_TOOLS_MAX_ENTRIES_MIN = 20
const DEV_TOOLS_MAX_ENTRIES_MAX = 500

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

/** Context provided to crash.view and crash.report when the runtime encounters
 *  an unrecoverable error. `message` is the Message being processed when the
 *  crash occurred, present as an `Option` because a crash during the initial
 *  render has no triggering Message. */
export type CrashContext<Model, Message> = Readonly<{
  error: Error
  model: Model
  message: Option.Option<Message>
}>

/** Configuration for crash handling, with custom crash UI and/or crash reporting. */
export type CrashConfig<Model, Message> = Readonly<{
  view?: (context: CrashContext<Model, Message>) => Document
  report?: (context: CrashContext<Model, Message>) => void
}>

/** Full runtime configuration including model schema, flags, init, update, view, and optional routing/stream config. */
type RuntimeConfig<
  Model,
  Message,
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
  /**
   * Whether the runtime owns document-level state. When `true`, each render
   * applies the view's `title`, `canonical`, and `og:url` to the document
   * `<head>`. When `false`, the runtime is scoped to its container and never
   * touches the `<head>`, so an app can be embedded at a node without
   * clobbering the host page's metadata. `makeApplication` sets this to `true`;
   * `makeElement` sets it to `false`.
   */
  manageDocument: boolean
  subscriptions?: Subscriptions<
    Model,
    Message,
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
   * RTCPeerConnection, CanvasRenderingContext2D). Stateless utilities like
   * HttpClient or BrowserKeyValueStore should be provided per-command instead.
   *
   * The runtime memoizes the layer, ensuring a single shared instance for all
   * commands and subscriptions throughout the application's lifetime.
   */
  resources?: Layer.Layer<Resources>
  /**
   * Model-driven resources with acquire/release lifecycle. Unlike `resources`
   * which persist for the application's lifetime, Managed Resources are
   * acquired and released based on the current model state. Create with
   * `ManagedResource.make`, compose child Submodels with `ManagedResource.lift`,
   * and combine records with `ManagedResource.aggregate`.
   */
  managedResources?: ManagedResources<Model, Message, ManagedResourceServices>
  devTools?: DevToolsConfig
}>

type BaseApplicationConfig<
  Model,
  Message,
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
    Resources | ManagedResourceServices
  >
  container: HTMLElement | null
  crash?: CrashConfig<Model, Message>
  slowView?: SlowViewConfig<Model, Message>
  freezeModel?: boolean
  resources?: Layer.Layer<Resources>
  managedResources?: ManagedResources<Model, Message, ManagedResourceServices>
  devTools?: DevToolsConfig
}>

/** Configuration for `makeApplication` with flags and URL routing. */
export type RoutingApplicationConfigWithFlags<
  Model,
  Message,
  Flags,
  Resources = never,
  ManagedResourceServices = never,
> = BaseApplicationConfig<Model, Message, Resources, ManagedResourceServices> &
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

/** Configuration for `makeApplication` with URL routing but no flags. */
export type RoutingApplicationConfig<
  Model,
  Message,
  Resources = never,
  ManagedResourceServices = never,
> = BaseApplicationConfig<Model, Message, Resources, ManagedResourceServices> &
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

/** Configuration for `makeApplication` with flags but no URL routing. */
export type ApplicationConfigWithFlags<
  Model,
  Message,
  Flags,
  Resources = never,
  ManagedResourceServices = never,
> = BaseApplicationConfig<Model, Message, Resources, ManagedResourceServices> &
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

/** Configuration for `makeApplication` without flags or URL routing. */
export type ApplicationConfig<
  Model,
  Message,
  Resources = never,
  ManagedResourceServices = never,
> = BaseApplicationConfig<Model, Message, Resources, ManagedResourceServices> &
  Readonly<{
    init: () => readonly [
      Model,
      ReadonlyArray<
        Command<Message, never, Resources | ManagedResourceServices>
      >,
    ]
  }>

/** Configuration for crash handling in a `makeElement` app. The crash view
 *  returns `Html`, not a `Document`, because a scoped app never owns the
 *  document `<head>`. */
export type ElementCrashConfig<Model, Message> = Readonly<{
  view?: (context: CrashContext<Model, Message>) => Html
  report?: (context: CrashContext<Model, Message>) => void
}>

type BaseElementConfig<
  Model,
  Message,
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
  view: (model: Model) => Html
  subscriptions?: Subscriptions<
    Model,
    Message,
    Resources | ManagedResourceServices
  >
  container: HTMLElement | null
  crash?: ElementCrashConfig<Model, Message>
  slowView?: SlowViewConfig<Model, Message>
  freezeModel?: boolean
  resources?: Layer.Layer<Resources>
  managedResources?: ManagedResources<Model, Message, ManagedResourceServices>
  devTools?: DevToolsConfig
}>

/** Configuration for `makeElement` with flags. */
export type ElementConfigWithFlags<
  Model,
  Message,
  Flags,
  Resources = never,
  ManagedResourceServices = never,
> = BaseElementConfig<Model, Message, Resources, ManagedResourceServices> &
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

/** Configuration for `makeElement` without flags. */
export type ElementConfig<
  Model,
  Message,
  Resources = never,
  ManagedResourceServices = never,
> = BaseElementConfig<Model, Message, Resources, ManagedResourceServices> &
  Readonly<{
    init: () => readonly [
      Model,
      ReadonlyArray<
        Command<Message, never, Resources | ManagedResourceServices>
      >,
    ]
  }>

/** The `init` function type for a `makeApplication` app without URL routing. */
export type ApplicationInit<
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

/** The `init` function type for a `makeApplication` app with URL routing, receives the current URL and optional flags. */
export type RoutingApplicationInit<
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

/** The `init` function type for a `makeElement` app. A scoped app never owns
 *  the URL, so its `init` has the same shape as a non-routing
 *  `ApplicationInit`: argless, or receiving flags when `Flags` is set. */
export type ElementInit<
  Model,
  Message,
  Flags = void,
  Resources = never,
  ManagedResourceServices = never,
> = ApplicationInit<Model, Message, Flags, Resources, ManagedResourceServices>

/** A configured Foldkit runtime returned by `makeApplication` or `makeElement`, passed to `run` to start the app. */
export type MakeRuntimeReturn = Readonly<{
  runtimeId: string
  start: (hmrModel?: unknown) => Effect.Effect<void>
}>

const makeRuntime = <
  Model,
  Message,
  Flags,
  Resources,
  ManagedResourceServices,
>({
  Model,
  flags: resolveFlags,
  init,
  update,
  view,
  manageDocument,
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

  const excludeFromHistoryTags: ReadonlySet<string> = pipe(
    devTools ?? {},
    Option.liftPredicate(config => config !== false),
    Option.flatMapNullishOr(config => config.excludeFromHistory),
    Option.match({
      onNone: () => new Set<string>(),
      onSome: tags => new Set(tags),
    }),
  )

  const devToolsMaxEntries: number | undefined = pipe(
    devTools ?? {},
    Option.liftPredicate(config => config !== false),
    Option.flatMapNullishOr(config => config.maxEntries),
    Option.map(value =>
      Math.max(
        DEV_TOOLS_MAX_ENTRIES_MIN,
        Math.min(DEV_TOOLS_MAX_ENTRIES_MAX, value),
      ),
    ),
    Option.getOrUndefined,
  )

  const maybeFreezeModel = (model: Model): Model =>
    isFreezeModelActive ? deepFreeze(model) : model

  const runtimeId = container?.id ?? ''

  // NOTE: When the message queue drains a chain of dispatches (e.g. recursive
  // Commands, websocket bursts), processing all of them inside one macrotask
  // blocks the browser from painting. Yield via MessageChannel once the
  // current burst exceeds FRAME_BUDGET_MS so the browser gets a frame.
  // setTimeout(0) is clamped to 4ms+; MessageChannel delivers in ~0.5ms.
  const FRAME_BUDGET_MS = 5

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
                'Set `container.id = "app"` (or any unique string) before passing it to makeApplication or makeElement.',
            ),
          )
        }

        // NOTE: one persistent MessageChannel for the runtime lifetime,
        // shared by every burst-budget yield. The queue-drain fiber is the
        // sole consumer, so a single `pendingYieldResume` slot is sufficient.
        const yieldChannel = yield* Effect.acquireRelease(
          Effect.sync(() => new MessageChannel()),
          channel =>
            Effect.sync(() => {
              channel.port1.close()
              channel.port2.close()
            }),
        )
        let pendingYieldResume: ((effect: Effect.Effect<void>) => void) | null =
          null
        yieldChannel.port2.onmessage = () => {
          const resume = pendingYieldResume
          pendingYieldResume = null
          if (resume !== null) {
            resume(Effect.void)
          }
        }
        const yieldToBrowser: Effect.Effect<void> = Effect.callback<void>(
          resume => {
            pendingYieldResume = resume
            yieldChannel.port1.postMessage(null)
            return Effect.sync(() => {
              if (pendingYieldResume === resume) {
                pendingYieldResume = null
              }
            })
          },
        )

        const maybeResourceLayer = Option.fromNullishOr(resources)

        // NOTE: One boundary registry per runtime instance, shared
        // across renders so Submodel wrap descriptors registered by
        // h.submodel persist between renders. The render function calls
        // `beginHtmlRender` at the start of each pass; wraps for
        // unmounted Submodels (e.g. an entry removed from a list) are
        // dropped from the registry via snabbdom destroy hooks attached
        // by `h.submodel` to each child vnode.
        const boundaryRegistry: BoundaryRegistry = createHtmlBoundaryRegistry()

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

        const ModelJsonCodec = Schema.toCodecJson(
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
          Model as Schema.Codec<Model>,
        )
        const decodeHmrModel = Schema.decodeUnknownExit(ModelJsonCodec)
        const encodeHmrModel = Schema.encodeUnknownSync(ModelJsonCodec)

        // NOTE: keep `encodeHmrModel` off the dispatch hot path. It walks
        // the entire Model graph (O(modelSize) per call) and blocks input
        // on large Models. The scheduler defers encoding to a quiet window
        // and the `vite:beforeFullReload` flush covers the HMR boundary.
        const PRESERVE_DEBOUNCE = Duration.millis(200)
        const preserveScheduler = yield* makePreserveScheduler<Model>(
          {
            onDebounce: model =>
              Effect.sync(() =>
                preserveModel(runtimeId, encodeHmrModel(model), false),
              ),
            onFlush: model =>
              Effect.sync(() =>
                preserveModel(runtimeId, encodeHmrModel(model), true),
              ),
          },
          PRESERVE_DEBOUNCE,
        )

        const hot = import.meta.hot
        if (hot) {
          yield* Effect.acquireRelease(
            Effect.sync(() => {
              // NOTE: Effect.runSync requires `flush` to have no async
              // suspensions. The scheduler is built to satisfy that: flush
              // clears pending atomically and runs `onFlush` without
              // interrupting the in-flight timer fiber, which keeps the
              // whole effect synchronous. If a future change adds an async
              // step (interrupt-await, sleep, fork) on this path, Vite may
              // race ahead to location.reload() before the encoded model
              // reaches the plugin.
              const handler = (): void => {
                Effect.runSync(preserveScheduler.flush)
              }
              hot.on('vite:beforeFullReload', handler)
              return handler
            }),
            handler =>
              Effect.sync(() => hot.off('vite:beforeFullReload', handler)),
          )
          yield* Effect.addFinalizer(() => preserveScheduler.cancel)
        }

        const schedulePreserveModel = (model: Model): Effect.Effect<void> =>
          hot ? preserveScheduler.schedule(model) : Effect.void

        // NOTE: Each enqueued Message carries a priority. Within a single
        // takeAll batch the drain loop processes all High before any Normal,
        // so user input (view dispatch, navigation, subscription events,
        // managed-resource events, external dispatchers) lands ahead of
        // chain-derived work (Command results) when they share a frame.
        // FIFO order is preserved within a priority class.
        const messageQueue = yield* Queue.unbounded<EnvelopedMessage<Message>>()

        const enqueueHigh = (message: Message) =>
          Queue.offer(messageQueue, { priority: 'High', message })

        const enqueueNormal = (message: Message) =>
          Queue.offer(messageQueue, { priority: 'Normal', message })

        const enqueueHighUnsafe = (message: Message): void => {
          Queue.offerUnsafe(messageQueue, { priority: 'High', message })
        }

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
                Effect.withSpan(command.name, {
                  attributes: command.args ?? {},
                }),
                provideAllResources,
                Effect.flatMap(enqueueNormal),
              ),
            ),
        )

        if (routingConfig) {
          addNavigationEventListeners(enqueueHighUnsafe, routingConfig)
        }

        const modelRef = yield* Ref.make<Model>(initModel)

        const maybeCurrentVNodeRef = yield* Ref.make<Option.Option<VNode>>(
          Option.none(),
        )

        // NOTE: shared by every perpetual fiber's crash path (init render,
        // render loop, message drain). Each fiber catches its own cause so a
        // failure surfaces as the crash view instead of dying silently and
        // leaving the DOM frozen at the last successful render.
        const crashWith = (
          cause: Cause.Cause<never>,
          maybeMessage: Option.Option<Message>,
        ): Effect.Effect<void> =>
          Effect.gen(function* () {
            const model = yield* Ref.get(modelRef)
            const squashed = Cause.squash(cause)
            const error =
              squashed instanceof Error ? squashed : new Error(String(squashed))
            renderCrashView(
              { error, model, message: maybeMessage },
              crash,
              container,
              maybeCurrentVNodeRef,
              manageDocument,
            )
          })

        // NOTE: queue-drain-fiber-local state. Kept as plain closure
        // variables instead of `Ref`s because nothing else reads or writes
        // them concurrently, and JS's single-threaded model already orders
        // writes against subsequent reads. `currentMessage` is read by the
        // crash handler, which runs inside the same `forever` fiber via
        // `Effect.catchCause`.
        let currentMessage = Option.none<Message>()
        let burstStartedAt = 0

        // NOTE: the DevTools store is installed at most once during boot and
        // never replaced. Caching it in a closure variable avoids a
        // `Ref.get` on every message and on every render-loop tick (the
        // store powers `isPausedEffect`).
        let maybeDevToolsStore: Option.Option<DevToolsStore> = Option.none()

        const dispatchSync = (message: unknown): void => {
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
          enqueueHighUnsafe(message as Message)
        }

        const dispatchAsync = (message: unknown): Effect.Effect<void> =>
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
          enqueueHigh(message as Message)

        const dispatch = { dispatchAsync, dispatchSync }

        const isRenderPendingRef = yield* SubscriptionRef.make(false)
        const maybeLastDirtyMessageRef = yield* Ref.make<
          Option.Option<Message>
        >(Option.none())

        const isPausedEffect: Effect.Effect<boolean> = Effect.suspend(() =>
          Option.match(maybeDevToolsStore, {
            onNone: () => Effect.succeed(false),
            onSome: ({ stateRef }) =>
              SubscriptionRef.get(stateRef).pipe(
                Effect.map(({ isPaused }) => isPaused),
              ),
          }),
        )

        const mountStartBuffer: Array<MountRecord> = []
        const mountEndBuffer: Array<MountRecord> = []
        const mountTracker: typeof MountTracker.Service = {
          started: (name, args) => {
            mountStartBuffer.push(
              args === undefined ? { name } : { name, args },
            )
          },
          ended: (name, args) => {
            mountEndBuffer.push(args === undefined ? { name } : { name, args })
          },
        }
        const drainMountEvents = (): Readonly<{
          starts: ReadonlyArray<MountRecord>
          ends: ReadonlyArray<MountRecord>
        }> => {
          const starts = mountStartBuffer.slice()
          const ends = mountEndBuffer.slice()
          mountStartBuffer.length = 0
          mountEndBuffer.length = 0
          return { starts, ends }
        }

        const processMessage = (message: Message): Effect.Effect<void> =>
          Effect.gen(function* () {
            const currentModel = yield* Ref.get(modelRef)

            const [nextModelRaw, commands] = update(currentModel, message)
            const nextModel = maybeFreezeModel(nextModelRaw)

            if (currentModel !== nextModel) {
              yield* Ref.set(modelRef, nextModel)
              yield* SubscriptionRef.set(isRenderPendingRef, true)
              yield* Ref.set(maybeLastDirtyMessageRef, Option.some(message))

              PubSub.publishUnsafe(modelPubSub, nextModel)
              yield* schedulePreserveModel(nextModel)
            }

            if (!Array.isReadonlyArrayEmpty(commands)) {
              yield* Effect.forEach(
                /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
                commands as ReadonlyArray<
                  AnyCommand<
                    Message,
                    never,
                    Resources | ManagedResourceServices
                  >
                >,
                command =>
                  Effect.forkDetach(
                    command.effect.pipe(
                      Effect.withSpan(command.name, {
                        attributes: command.args ?? {},
                      }),
                      provideAllResources,
                      Effect.flatMap(enqueueNormal),
                    ),
                  ),
              )
            }

            /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
            const messageTag = (message as { _tag: string })._tag
            const isModelChanged = currentModel !== nextModel
            const isExcludedFromHistory = excludeFromHistoryTags.has(messageTag)

            if (Option.isSome(maybeDevToolsStore)) {
              const store = maybeDevToolsStore.value
              if (!isExcludedFromHistory) {
                yield* store.recordMessage(
                  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
                  message as Message & { _tag: string },
                  currentModel,
                  nextModel,
                  Array.map(
                    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
                    commands as ReadonlyArray<AnyCommand<Message>>,
                    toCommandRecord,
                  ),
                  isModelChanged,
                )
              } else if (isModelChanged) {
                yield* store.updateLatestModel(nextModel)
              }
            }
          })

        // NOTE: `dispatchService` defaults to the live dispatch but is
        // overridable so the DevTools jumpTo render path can pass
        // `noOpDispatch`. Mount Effects forked during a replay render still
        // execute (so the rendered DOM looks correct: positioning,
        // observer attachment, library setup), but their result Messages
        // reach a no-op dispatchSync and never enter the runtime queue.
        // This prevents mount-derived Messages from polluting history when
        // the user is just inspecting past state.
        const render = (
          model: Model,
          message: Option.Option<Message>,
          dispatchService: typeof Dispatch.Service = dispatch,
        ) =>
          Effect.gen(function* () {
            const runtimeContext = yield* Effect.context<never>()
            const viewStart = performance.now()
            beginHtmlRender(boundaryRegistry)
            setHtmlRuntime(
              dispatchService.dispatchSync,
              runtimeContext,
              boundaryRegistry,
            )
            let nextDocument: Document
            try {
              nextDocument = view(model)
            } finally {
              clearHtmlRuntime()
            }
            const nextVNode = nextDocument.body
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
              patchVNode(maybeCurrentVNode, nextVNode, container),
            )
            yield* Ref.set(maybeCurrentVNodeRef, Option.some(patchedVNode))

            if (manageDocument) {
              yield* Effect.sync(() =>
                applyDocumentMetadata(nextDocument, patchedVNode.elm),
              )
            }
          }).pipe(
            Effect.provideService(Dispatch, dispatchService),
            Effect.provideService(MountTracker, mountTracker),
          )

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
            mode: resolveDevToolsMode(config.mode ?? DEFAULT_DEV_TOOLS_MODE),
            maybeBanner: Option.fromNullishOr(config.banner),
          })),
        )

        if (Option.isSome(resolvedDevTools)) {
          const { position, mode, maybeBanner } = resolvedDevTools.value
          // NOTE: when excludeFromHistory is active, the runtime drops
          // excluded Messages from the recorded history. Replay walks the
          // recorded entries forward from the nearest keyframe. With
          // exclusion, the dropped Messages aren't in that walk, so any
          // cumulative state they would have produced is missing from the
          // replayed model. Setting keyframeInterval to 1 stores a full
          // snapshot on every recorded entry, so time-travel becomes a
          // direct lookup that reflects the real live state at the moment
          // the entry was recorded.
          const isExcludingMessages = excludeFromHistoryTags.size > 0
          const devToolsStore = yield* createDevToolsStore(
            {
              /* eslint-disable @typescript-eslint/consistent-type-assertions */
              replay: (model, message) => {
                const [updatedModel] = update(
                  model as Model,
                  message as Message,
                )
                return maybeFreezeModel(updatedModel)
              },
              /* eslint-enable @typescript-eslint/consistent-type-assertions */
              // NOTE: clears the dirty bit on the jumpTo render so the
              // renderLoop's Stream.changes sees the next dispatch as a real
              // false-to-true transition rather than a deduped no-op. Passes
              // `noOpDispatch` so mount Effects forked during the replay
              // render dispatch their result Messages into a no-op (instead
              // of enqueueing them as new history entries). Also discards
              // mount events fired during the render so they don't get
              // attributed to the next user-initiated dispatch.
              render: model =>
                Effect.gen(function* () {
                  yield* SubscriptionRef.set(isRenderPendingRef, false)
                  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
                  yield* render(model as Model, Option.none(), noOpDispatch)
                  drainMountEvents()
                }),
              // NOTE: `resume` calls this to wake the renderLoop after a
              // jumpTo render attached DOM listeners to `noOpDispatch`. The
              // false-to-true transition triggers one tick on the next
              // animation frame, which renders the live model with live
              // dispatch and rebinds listeners.
              markRenderPending: SubscriptionRef.set(isRenderPendingRef, true),
            },
            {
              ...(isExcludingMessages && { keyframeInterval: 1 }),
              ...(devToolsMaxEntries !== undefined && {
                maxEntries: devToolsMaxEntries,
              }),
            },
          )
          maybeDevToolsStore = Option.some(devToolsStore)
          // The init render runs below; capture the events it produces. We
          // record init AFTER that render so the buffer reflects the mounts
          // that fired on the first paint.
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
              message => enqueueHigh(message as Message),
              /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
              maybeMessageSchema as Option.Option<Schema.Codec<any, any>>,
            )
          }
        }

        const initRenderExit = yield* Effect.exit(
          render(initModel, Option.none()),
        )
        if (Exit.isFailure(initRenderExit)) {
          return yield* crashWith(initRenderExit.cause, Option.none())
        }

        const initMountEvents = drainMountEvents()
        yield* Option.match(maybeDevToolsStore, {
          onNone: () => Effect.void,
          onSome: store =>
            store.recordInit(
              initModel,
              Array.map(initCommands, toCommandRecord),
              initMountEvents.starts,
            ),
        })

        // NOTE: maybeLastDirtyMessageRef holds the most recent dirtying
        // Message, so slow-view callbacks during high-rate bursts attribute
        // to the last Message in the frame batch, not the specific one that
        // pushed the view past threshold. Acceptable for a debug callback;
        // full attribution would require correlating each message with its
        // render contribution, which isn't worth the complexity.

        const renderLoop = makeRenderLoop({
          pendingRef: isRenderPendingRef,
          awaitNextFrame,
          isPaused: isPausedEffect,
          render: Effect.gen(function* () {
            const model = yield* Ref.get(modelRef)
            const maybeMessage = yield* Ref.get(maybeLastDirtyMessageRef)
            yield* render(model, maybeMessage)

            const mountEvents = drainMountEvents()
            yield* Option.match(maybeDevToolsStore, {
              onNone: () => Effect.void,
              onSome: store =>
                store.attachRenderedMounts(
                  mountEvents.starts,
                  mountEvents.ends,
                ),
            })
          }),
        })

        yield* Effect.forkDetach(
          renderLoop.pipe(
            Effect.catchCause(cause =>
              Effect.gen(function* () {
                const maybeMessage = yield* Ref.get(maybeLastDirtyMessageRef)
                yield* crashWith(cause, maybeMessage)
              }),
            ),
          ),
        )

        addBfcacheRestoreListener()

        if (subscriptions) {
          yield* pipe(
            subscriptions,
            Record.toEntries,
            Effect.forEach(
              ([
                _key,
                {
                  dependenciesSchema,
                  modelToDependencies,
                  keepAliveEquivalence,
                  dependenciesToStream,
                },
              ]) =>
                Effect.gen(function* () {
                  const latestDependenciesRef = yield* Ref.make(
                    modelToDependencies(initModel),
                  )
                  const equivalence =
                    keepAliveEquivalence ??
                    Schema.toEquivalence(dependenciesSchema)

                  const modelStream = Stream.concat(
                    Stream.make(initModel),
                    Stream.fromPubSub(modelPubSub),
                  )

                  yield* Effect.forkDetach(
                    modelStream.pipe(
                      // NOTE: Ref.set runs upstream of Stream.changesWith on
                      // every model change, so readDependencies() returns
                      // current values even when the equivalence filter
                      // doesn't emit. Moving this into a tap after
                      // changesWith would silently break subscribers whose
                      // dependencies are equivalence-stable across model
                      // changes.
                      Stream.mapEffect(model =>
                        Effect.gen(function* () {
                          const dependencies = modelToDependencies(model)
                          yield* Ref.set(latestDependenciesRef, dependencies)
                          return dependencies
                        }),
                      ),
                      Stream.changesWith(equivalence),
                      Stream.switchMap(dependencies =>
                        dependenciesToStream(dependencies, () =>
                          Ref.getUnsafe(latestDependenciesRef),
                        ),
                      ),
                      Stream.runForEach(message =>
                        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
                        enqueueHigh(message as Message),
                      ),
                      provideAllResources,
                    ),
                  )
                }),
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
                yield* enqueueHigh(config.onReleased())
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
                Stream.runForEach(Effect.flatMap(enqueueHigh)),
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

        const processWithBudget = (message: Message): Effect.Effect<void> =>
          Effect.gen(function* () {
            currentMessage = Option.some(message)
            yield* processMessage(message)

            if (performance.now() - burstStartedAt < FRAME_BUDGET_MS) {
              return
            }

            yield* yieldToBrowser
            burstStartedAt = performance.now()
          })

        const processBatch = (
          batch: ReadonlyArray<EnvelopedMessage<Message>>,
        ): Effect.Effect<void> =>
          Effect.forEach(orderByPriority(batch), processWithBudget, {
            discard: true,
          })

        // NOTE: Effect 4's `Queue.takeAll` blocks until at least one message
        // arrives (it's `takeBetween(self, 1, ∞)`, not a non-blocking
        // snapshot). For batching we want "give me whatever is currently in
        // the queue, possibly nothing" so we drain via repeated `Queue.poll`
        // until it returns `None`.
        const pollAvailable: Effect.Effect<
          ReadonlyArray<EnvelopedMessage<Message>>
        > = Effect.gen(function* () {
          const accumulated: Array<EnvelopedMessage<Message>> = []
          while (true) {
            const next = yield* Queue.poll(messageQueue)
            if (Option.isNone(next)) {
              return accumulated
            }
            accumulated.push(next.value)
          }
        })

        const drainQueue: Effect.Effect<void> = Effect.gen(function* () {
          const batch = yield* pollAvailable
          if (Array.isReadonlyArrayEmpty(batch)) {
            return
          }
          yield* processBatch(batch)
          yield* drainQueue
        })

        // NOTE: only reset the burst timer when `Queue.take` actually blocked
        // (queue was empty). With Command-chained dispatches each forever
        // iteration handles a single message, so resetting unconditionally
        // would keep the per-iteration cost under FRAME_BUDGET_MS forever
        // and the runtime would never yield to the browser. Polling first
        // distinguishes "continuing a burst" (poll returns Some) from
        // "waking from idle" (poll returns None, take blocks).
        yield* pipe(
          Effect.forever(
            Effect.gen(function* () {
              const maybeFirst = yield* Queue.poll(messageQueue)
              const first = yield* Option.match(maybeFirst, {
                onNone: () =>
                  Effect.gen(function* () {
                    const message = yield* Queue.take(messageQueue)
                    burstStartedAt = performance.now()
                    return message
                  }),
                onSome: Effect.succeed,
              })
              const rest = yield* pollAvailable
              yield* processBatch(Array.prepend(rest, first))
              yield* drainQueue
            }),
          ),
          Effect.catchCause(cause => crashWith(cause, currentMessage)),
        )
      }),
    )

  return { runtimeId, start }
}

// NOTE: exported for `patchVNode.test.ts` to assert the dedupeSharedVNodes
// wiring; not part of the public surface (`runtime/public.ts` is curated).
export const patchVNode = (
  maybeCurrentVNode: Option.Option<VNode>,
  nextVNode: VNode | null,
  container: HTMLElement,
): VNode => {
  const dedupedVNode = Predicate.isNotNull(nextVNode)
    ? dedupeSharedVNodes(nextVNode)
    : h('!')

  return Option.match(maybeCurrentVNode, {
    onNone: () => patch(toVNode(container), dedupedVNode),
    onSome: currentVNode => patch(currentVNode, dedupedVNode),
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
  mountedRoot: Node | undefined,
): void => {
  if (!mountedRoot || !document.body.contains(mountedRoot)) {
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
  manageDocument: boolean,
): void => {
  console.error('[foldkit] Application crash:', context.error)

  if (crash?.report) {
    try {
      crash.report(context)
    } catch (reportError) {
      console.error('[foldkit] crash.report failed:', reportError)
    }
  }

  const crashContext = Context.make(Dispatch, noOpDispatch).pipe(
    Context.add(MountTracker, {
      started: () => {},
      ended: () => {},
    }),
  )

  try {
    setHtmlRuntime(noOpDispatch.dispatchSync, crashContext)
    let crashDocument: Document
    try {
      crashDocument = crash?.view
        ? crash.view(context)
        : defaultCrashView(context)
    } finally {
      clearHtmlRuntime()
    }

    const maybeCurrentVNode = Effect.runSync(Ref.get(maybeCurrentVNodeRef))
    const patchedVNode = patchVNode(
      maybeCurrentVNode,
      crashDocument.body,
      container,
    )
    if (manageDocument) {
      applyDocumentMetadata(crashDocument, patchedVNode.elm)
    }
  } catch (viewError) {
    console.error('[foldkit] crash.view failed:', viewError)

    const fallbackViewError =
      viewError instanceof Error ? viewError : new Error(String(viewError))

    setHtmlRuntime(noOpDispatch.dispatchSync, crashContext)
    let fallbackDocument: Document
    try {
      fallbackDocument = defaultCrashView(context, fallbackViewError)
    } finally {
      clearHtmlRuntime()
    }

    const maybeCurrentVNode = Effect.runSync(Ref.get(maybeCurrentVNodeRef))
    const patchedVNode = patchVNode(
      maybeCurrentVNode,
      fallbackDocument.body,
      container,
    )
    if (manageDocument) {
      applyDocumentMetadata(fallbackDocument, patchedVNode.elm)
    }
  }
}

/** Creates a Foldkit application that owns the page and returns a runtime that
 *  can be passed to `run`. The `view` returns a `Document`, so the runtime
 *  manages `document.title` and the canonical / og:url tags. Add a `routing`
 *  config for URL routing. To mount an app scoped to a node without touching the
 *  document `<head>`, use `makeElement`. */
export function makeApplication<
  Model,
  Message extends { _tag: string },
  Flags,
  Resources = never,
  ManagedResourceServices = never,
>(
  config: RoutingApplicationConfigWithFlags<
    Model,
    Message,
    Flags,
    Resources,
    ManagedResourceServices
  >,
): MakeRuntimeReturn

export function makeApplication<
  Model,
  Message extends { _tag: string },
  Resources = never,
  ManagedResourceServices = never,
>(
  config: RoutingApplicationConfig<
    Model,
    Message,
    Resources,
    ManagedResourceServices
  >,
): MakeRuntimeReturn

export function makeApplication<
  Model,
  Message extends { _tag: string },
  Flags,
  Resources = never,
  ManagedResourceServices = never,
>(
  config: ApplicationConfigWithFlags<
    Model,
    Message,
    Flags,
    Resources,
    ManagedResourceServices
  >,
): MakeRuntimeReturn

export function makeApplication<
  Model,
  Message extends { _tag: string },
  Resources = never,
  ManagedResourceServices = never,
>(
  config: ApplicationConfig<Model, Message, Resources, ManagedResourceServices>,
): MakeRuntimeReturn

export function makeApplication<
  Model,
  Message extends { _tag: string },
  Flags,
  Resources = never,
  ManagedResourceServices = never,
>(
  config:
    | RoutingApplicationConfigWithFlags<
        Model,
        Message,
        Flags,
        Resources,
        ManagedResourceServices
      >
    | RoutingApplicationConfig<
        Model,
        Message,
        Resources,
        ManagedResourceServices
      >
    | ApplicationConfigWithFlags<
        Model,
        Message,
        Flags,
        Resources,
        ManagedResourceServices
      >
    | ApplicationConfig<Model, Message, Resources, ManagedResourceServices>,
): MakeRuntimeReturn {
  const { container } = config
  if (container === null) {
    throw new Error(
      '[foldkit] Container is null. Make sure the element exists in the DOM ' +
        'before calling makeApplication (e.g. that your <div id="root"></div> has ' +
        'rendered, and your script runs after it).',
    )
  }

  const hasRouting = 'routing' in config
  const hasFlags = 'Flags' in config

  const currentUrl: Url | undefined = hasRouting
    ? Option.getOrThrow(urlFromString(window.location.href))
    : undefined

  const baseConfig = {
    Model: config.Model,
    update: config.update,
    view: config.view,
    manageDocument: true,
    ...(config.subscriptions && { subscriptions: config.subscriptions }),
    container,
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
          config as RoutingApplicationConfigWithFlags<
            Model,
            Message,
            Flags,
            Resources,
            ManagedResourceServices
          >
        ).init(flags as Flags, url ?? currentUrl!),
    } as RuntimeConfig<
      Model,
      Message,
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
          config as RoutingApplicationConfig<
            Model,
            Message,
            Resources,
            ManagedResourceServices
          >
        ).init(url ?? currentUrl!),
    } as RuntimeConfig<
      Model,
      Message,
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
          config as ApplicationConfigWithFlags<
            Model,
            Message,
            Flags,
            Resources,
            ManagedResourceServices
          >
        ).init(flags as Flags),
    } as RuntimeConfig<
      Model,
      Message,
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
          config as ApplicationConfig<
            Model,
            Message,
            Resources,
            ManagedResourceServices
          >
        ).init(),
    } as RuntimeConfig<
      Model,
      Message,
      void,
      Resources,
      ManagedResourceServices
    >)
  }
  /* eslint-enable @typescript-eslint/consistent-type-assertions */
}

const toCrashConfig = <Model, Message>(
  nullableCrash: ElementCrashConfig<Model, Message> | undefined,
): CrashConfig<Model, Message> | undefined => {
  if (Predicate.isUndefined(nullableCrash)) {
    return undefined
  }

  const elementCrashView = nullableCrash.view

  return {
    ...(Predicate.isNotUndefined(elementCrashView) && {
      view: (context: CrashContext<Model, Message>): Document => ({
        title: '',
        body: elementCrashView(context),
      }),
    }),
    ...(Predicate.isNotUndefined(nullableCrash.report) && {
      report: nullableCrash.report,
    }),
  }
}

/**
 * Creates a Foldkit app scoped to its container and returns a runtime that
 * can be passed to `run`.
 *
 * Unlike `makeApplication`, the `view` returns `Html` directly rather than a
 * `Document`, and the runtime never touches the document `<head>`. This lets a
 * Foldkit app be embedded at a node (a widget on a page it does not own)
 * without clobbering the host page's `title`, `canonical`, or `og:url`. Use
 * `makeApplication` when the app owns the page and should manage those tags, and
 * `makeElement` when it is one component among others on a page it does not
 * control. Embedded apps do not own the URL bar, so `makeElement` has no
 * `routing` config.
 */
export function makeElement<
  Model,
  Message extends { _tag: string },
  Flags,
  Resources = never,
  ManagedResourceServices = never,
>(
  config: ElementConfigWithFlags<
    Model,
    Message,
    Flags,
    Resources,
    ManagedResourceServices
  >,
): MakeRuntimeReturn

export function makeElement<
  Model,
  Message extends { _tag: string },
  Resources = never,
  ManagedResourceServices = never,
>(
  config: ElementConfig<Model, Message, Resources, ManagedResourceServices>,
): MakeRuntimeReturn

export function makeElement<
  Model,
  Message extends { _tag: string },
  Flags,
  Resources = never,
  ManagedResourceServices = never,
>(
  config:
    | ElementConfigWithFlags<
        Model,
        Message,
        Flags,
        Resources,
        ManagedResourceServices
      >
    | ElementConfig<Model, Message, Resources, ManagedResourceServices>,
): MakeRuntimeReturn {
  const { container } = config
  if (container === null) {
    throw new Error(
      '[foldkit] Container is null. Make sure the element exists in the DOM ' +
        'before calling makeElement (e.g. that your <div id="root"></div> has ' +
        'rendered, and your script runs after it).',
    )
  }

  const hasFlags = 'Flags' in config

  const elementView = config.view
  const view = (model: Model): Document => ({
    title: '',
    body: elementView(model),
  })

  const nullableCrash = toCrashConfig(config.crash)

  const baseConfig = {
    Model: config.Model,
    update: config.update,
    view,
    manageDocument: false,
    ...(config.subscriptions && { subscriptions: config.subscriptions }),
    container,
    ...(Predicate.isNotUndefined(nullableCrash) && { crash: nullableCrash }),
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
  if (hasFlags) {
    return makeRuntime({
      ...baseConfig,
      Flags: config.Flags,
      flags: config.flags,
      init: (flags: unknown) =>
        (
          config as ElementConfigWithFlags<
            Model,
            Message,
            Flags,
            Resources,
            ManagedResourceServices
          >
        ).init(flags as Flags),
    } as RuntimeConfig<
      Model,
      Message,
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
          config as ElementConfig<
            Model,
            Message,
            Resources,
            ManagedResourceServices
          >
        ).init(),
    } as RuntimeConfig<
      Model,
      Message,
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

const preserveModel = (
  id: string,
  encodedModel: unknown,
  isHmrReload: boolean,
): void => {
  if (import.meta.hot) {
    import.meta.hot.send(
      'foldkit:preserve-model',
      encodePreserveModelMessage(
        PreserveModelMessage.make({ id, model: encodedModel, isHmrReload }),
      ),
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
