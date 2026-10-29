import {
  Array,
  Context,
  Duration,
  Effect,
  Exit,
  Fiber,
  Layer,
  Option,
  Predicate,
  PubSub,
  Result,
  Schema,
  pipe,
} from 'effect'

import type { BindableBlock } from '../block/binding.js'
import { commandInstances } from '../block/instanceContext.js'
import { assertComposedHandlers } from '../block/lowering.js'
import { DialogRuntime } from '../dom/dialogRuntime.js'
import { releaseDialogResources } from '../dom/dom.js'
import {
  Document,
  type HtmlBuilder,
  __htmlBuilder as htmlBuilderFor,
} from '../html/index.js'
import type { ManagedResources } from '../managedResource/index.js'
import type { AnyMountHandler, LayeredMountDefinition } from '../mount/index.js'
import type { Ports } from '../port/index.js'
import { RenderCommit, createCommitNotifier } from '../render/commit.js'
import {
  type Registrations,
  aggregate as aggregateSubscriptions,
} from '../subscription/subscription.js'
import type { Return as UpdateReturn } from '../update/index.js'
import { Url, fromString as urlFromString } from '../url/index.js'
import {
  type RoutingConfig,
  addNavigationEventListeners,
} from './browserListeners.js'
import type { CapturedInvocation } from './compositionRuntime.js'
import {
  type CompositionRuntime,
  makeCompositionRuntime,
} from './compositionRuntime.js'
import type { CrashConfig } from './crashUI.js'
import { deepFreeze } from './deepFreeze.js'
import type { RuntimeDevToolsConfig } from './devToolsConfig.js'
import { makeDevToolsIntegration } from './devToolsIntegration.js'
import { createDuplicateIdScanner } from './duplicateIdScanner.js'
import {
  type HostConnector,
  type PortChannelsBundle,
  makePortChannels,
  validatePorts,
} from './hostConnector.js'
import {
  type BootMode,
  type HydrationConfig,
  resolveHydrationHandoff,
} from './hydrationHandoff.js'
import { forkManagedResourceFibers } from './managedResourceFibers.js'
import { type MessageQueue, makeMessageQueue } from './messageQueue.js'
import { preserveModel } from './modelPreservationBridge.js'
import { makePreserveScheduler } from './preserveScheduler.js'
import { type ResolvedViewTransition, makeRenderer } from './renderer.js'
import { makeResourceProvider } from './resourceProvider.js'
import { makeRuntimeStatus } from './runtimeStatus.js'
import {
  preserveScrollPosition,
  restorePreservedScrollPosition,
} from './scrollPreservation.js'
import {
  type SlowConfig,
  type SlowUpdateContext,
  __resolveSlowConfig,
  measureSlowPhase,
  reportSlowPhase,
} from './slowPhase.js'
import { forkSubscriptionFibers } from './subscriptionFibers.js'
import {
  type ViewTransitionConfig,
  __resolveStartViewTransition,
} from './viewTransition.js'
import { type Visibility, isVisible } from './visibility.js'

type AnyCommand<T, E = never, R = never> = {
  readonly name: string
  readonly args?: Record<string, unknown>
  readonly effect: Effect.Effect<T, E, R>
}

/** Full runtime configuration including Model Schema, Flags, init, update, view, and optional routing/stream config. */
export type RuntimeConfig<
  Model,
  Message,
  Flags,
  Resources = never,
  ManagedResourceServices = never,
  P extends Ports | undefined = undefined,
  Kind extends 'Application' | 'Element' = 'Application' | 'Element',
> = Readonly<{
  kind: Kind
  ports: P
  Model: Schema.Codec<Model, any, unknown, unknown>
  Flags: Schema.Codec<Flags, any, unknown, unknown>
  configuredFlags: Option.Option<Effect.Effect<Flags, never, Resources>>
  isFlagsRequired: boolean
  init: (
    flags: Flags,
    url?: Url,
  ) => UpdateReturn<Model, Message, Resources | ManagedResourceServices>
  update: (
    model: Model,
    message: Message,
  ) => UpdateReturn<Model, Message, Resources | ManagedResourceServices>
  view: (model: Model, h: HtmlBuilder<Message, AnyMountHandler>) => Document
  /**
   * Whether the runtime owns document-level state. When `true`, each render
   * applies the view's `title`, `canonical`, and `og:url` to the document
   * `<head>`. When `false`, the runtime is scoped to its container and never
   * touches the `<head>`, so an app can be embedded at a node without
   * clobbering the host page's metadata. `makeApplication` sets this to `true`;
   * `makeElement` sets it to `false`.
   */
  manageDocument: boolean
  subscriptions?: Registrations<
    Model,
    Message,
    Resources | ManagedResourceServices
  >
  mounts?: ReadonlyArray<LayeredMountDefinition>
  container: HTMLElement
  /**
   * Present when `makeApplication` found a server-rendered root stamped with
   * `data-foldkit-app`. The first render then adopts that DOM in place
   * instead of replacing it, and when the config declares Flags, `init` is
   * fed the Schema-decoded Flags payload the server embedded, so both sides
   * compute the same Model. Missing or undecodable handoff data is fatal.
   * A Model restored after a development reload gets a fresh replace boot
   * against the stamped root because the restored code may no longer match the
   * served DOM.
   */
  hydration?: HydrationConfig
  routing?: RoutingConfig<Message>
  crash?: CrashConfig<Model, Message>
  slow?: SlowConfig<Model, Message>
  /**
   * Wraps qualifying renders in `document.startViewTransition` so the browser
   * animates between the old and new DOM states. Return `false` for a plain
   * render, `true` to transition, or `{ types }` to tag the transition for
   * `:active-view-transition-type(...)` CSS scoping.
   *
   * The predicate runs after `update` and before the render it is deciding
   * about, and receives both states: `context.previousModel` is the Model
   * behind the DOM on screen, `context.model` is the one the render will
   * paint. Comparing the two is how a predicate derives direction without the
   * application keeping route history in its Model.
   *
   * Renders fall through to the plain path when the browser lacks the API,
   * when `prefers-reduced-motion: reduce` is set, and during DevTools replay,
   * crash, and initial renders.
   *
   * Defaults to `undefined`: no render is wrapped in a transition, and the
   * runtime resolves nothing about the browser's support for them.
   */
  viewTransition?: ViewTransitionConfig<Model, Message>
  /**
   * Deep-freezes the Model after `init` and after every `update`, so accidental
   * mutations (e.g. `model.items.push(...)`) throw a `TypeError` at the exact
   * write site with a stack trace, rather than silently corrupting state or
   * breaking reference-equality change detection.
   *
   * Defaults to `true`. Activates only under Vite's dev server, so production
   * builds pay nothing. Pass `false` to disable.
   *
   * Scope: only the Model is frozen. Messages are short-lived and are not
   * frozen.
   */
  freezeModel?: boolean
  /**
   * Restores the window scroll position across Vite dev reloads. Every edit
   * triggers a full page reload, which resets scroll to the top; this captures
   * `window.scrollX`/`scrollY` just before the reload and reapplies it once the
   * restored view has rendered, so editing a page you've scrolled deep into
   * doesn't bounce you back to the top on every save.
   *
   * Defaults to `true`. Activates only under Vite's dev server and the
   * runtime owns the document, so production builds and embedded `makeElement`
   * apps (which do not own the page's scroll) pay nothing. Pass `false` to
   * disable, for an app that drives its own scroll restoration.
   *
   * Scope: only the window scroll offset is preserved. Scroll positions of
   * nested `overflow` containers are not.
   */
  preserveScroll?: boolean
  /**
   * Model-driven handle registrations collected from the completed Block
   * graph. The Runtime acquires and releases handles as their requirements
   * change. Features declare local registries with `managedResources`;
   * registered child bindings supply their occurrence-scoped registrations.
   */
  managedResources?: ManagedResources<Model, Message, ManagedResourceServices>
  devTools?: RuntimeDevToolsConfig<Resources>
}>

export type FlagsSchemaConfig<Flags> = Readonly<{
  // Flags decode synchronously, on hydration through `decodeUnknownSync` and
  // across development reloads through the sync Model/Flags codec, so the codec
  // must require no decode or encode services. The `never` service parameters
  // also make a full application config assignable to the experimental server
  // render input, which needs the same guarantee to serialize Flags without an
  // app context.
  Flags: Schema.Codec<Flags, any, never, never>
}>

/** A configured Foldkit runtime returned by `makeApplication` or `makeElement`.
 *  Pass it to `run` to start a page-owning app, or to `embed` to start it under
 *  a host-controlled lifecycle handle. `ports` is the Ports record from the
 *  config (or `undefined` when the config declared none); it types the
 *  `EmbedHandle` that `embed` returns. `Flags` and `Resources` carry the
 *  fresh-boot requirements from `makeApplication` to `run` and `embed`; they
 *  have no runtime representation.
 */
export type MakeRuntimeReturn<
  P extends Ports | undefined = undefined,
  Flags = void,
  Resources = never,
  Kind extends 'Application' | 'Element' = 'Application' | 'Element',
> = Readonly<{
  runtimeId: string
  start: (preservedModel?: unknown) => Effect.Effect<void>
  ports: P
  '~foldkit/RuntimeBoot'?: Readonly<{
    Flags: (flags: Flags) => Flags
    Resources: (resources: Resources) => Resources
    Kind: Kind
  }>
}>

type EmbedLifecycle = {
  isEmbedActive: boolean
  maybeActiveFiber: Option.Option<Fiber.Fiber<void>>
}

type RuntimeInternals = {
  startWith: (
    maybeConnector: Option.Option<HostConnector>,
    preservedModel?: unknown,
    bootMode?: BootMode,
    flags?: Effect.Effect<any, never, any>,
    buildId?: string,
  ) => Effect.Effect<void>
  startWithApplicationLayer: (
    maybeConnector: Option.Option<HostConnector>,
    preservedModel: unknown,
    bootMode: BootMode,
    flags: Effect.Effect<any, never, any> | undefined,
    buildId: string | undefined,
    applicationLayer: Layer.Layer<any, any, any>,
  ) => Effect.Effect<void>
  applicationLayer?: Layer.Layer<any, any, any>
  compositionRoot?: BindableBlock
  kind: 'Application' | 'Element'
  embedLifecycle: EmbedLifecycle
}

export const runtimeInternals = new WeakMap<object, RuntimeInternals>()

export const makeRuntime = <
  Model,
  Message,
  Flags,
  Resources,
  ManagedResourceServices,
  P extends Ports | undefined,
  Kind extends 'Application' | 'Element',
>({
  ports,
  kind,
  Model,
  Flags: FlagsCodec,
  configuredFlags,
  isFlagsRequired,
  init,
  update,
  view,
  manageDocument,
  subscriptions,
  mounts,
  container,
  hydration,
  routing: routingConfig,
  crash,
  slow,
  viewTransition,
  freezeModel,
  preserveScroll,
  managedResources,
  devTools,
}: RuntimeConfig<
  Model,
  Message,
  Flags,
  Resources,
  ManagedResourceServices,
  P,
  Kind
>): MakeRuntimeReturn<P, Flags, Resources, Kind> => {
  const isSlowVisible = (show: Visibility): boolean =>
    isVisible(show, !!import.meta.hot)

  const htmlBuilder = htmlBuilderFor<Message, AnyMountHandler>()

  const maybeResolvedSlow = __resolveSlowConfig(slow, isSlowVisible)

  const maybeSlowView = Option.flatMap(maybeResolvedSlow, ({ view }) => view)
  const maybeSlowUpdate = Option.flatMap(
    maybeResolvedSlow,
    ({ update }) => update,
  )
  const maybeSlowPatch = Option.flatMap(maybeResolvedSlow, ({ patch }) => patch)
  const maybeSlowSubscriptionDependencies = Option.flatMap(
    maybeResolvedSlow,
    ({ subscriptionDependencies }) => subscriptionDependencies,
  )

  // NOTE: detection sits inside the flatMap so it runs only for applications
  // that configured the option. Resolved eagerly it would read
  // `document.startViewTransition` and call `window.matchMedia` during
  // `makeRuntime`, which otherwise touches no DOM global at construction.
  const maybeResolvedViewTransition: Option.Option<
    ResolvedViewTransition<Model, Message>
  > = pipe(
    Option.fromNullishOr(viewTransition),
    Option.flatMap(decide =>
      Option.map(__resolveStartViewTransition(), startViewTransition => ({
        decide,
        startViewTransition,
        reducedMotionQuery: window.matchMedia(
          '(prefers-reduced-motion: reduce)',
        ),
      })),
    ),
  )

  const isFreezeModelActive = freezeModel !== false && !!import.meta.hot

  const isPreserveScrollActive =
    preserveScroll !== false && manageDocument && !!import.meta.hot

  const duplicateIdScanner = import.meta.hot
    ? createDuplicateIdScanner()
    : undefined

  const maybeFreezeModel = (model: Model): Model =>
    isFreezeModelActive ? deepFreeze(model) : model

  if (Predicate.isNotUndefined(ports)) {
    validatePorts(ports)
  }

  const runtimeId =
    hydration !== undefined && hydration.runtimeId !== ''
      ? hydration.runtimeId
      : (container?.id ?? '')

  const startWith = (
    maybeConnector: Option.Option<HostConnector>,
    preservedModel?: unknown,
    bootMode: BootMode = 'Fresh',
    bootFlags?: Effect.Effect<Flags, never, Resources>,
    buildId?: string,
    applicationLayer?: Layer.Layer<any, any, any>,
  ): Effect.Effect<void> => {
    // NOTE: one notifier per runtime, provided across the whole runtime
    // Effect so Commands, Subscriptions, and Mount-forked Effects all resolve
    // the same signal. A commit in one embedded application must never wake a
    // `Render.afterCommit` awaiting inside another.
    const commitNotifier = createCommitNotifier()
    const dialogIds = new Set<string>()

    return Effect.scoped(
      Effect.gen(function* () {
        if (runtimeId === '') {
          return yield* Effect.die(
            new Error(
              '[foldkit] Runtime container must have an `id` for Model preservation across reloads. ' +
                'Set `container.id = "app"` (or any unique string) before passing it to makeApplication or makeElement. ' +
                'On a server-rendered page the id comes from the `data-foldkit-app` root stamp instead.',
            ),
          )
        }

        // NOTE: every perpetual fiber (for example, Subscription streams
        // and ManagedResource lifecycles) and every Command fiber forks
        // into the runtime scope, so interrupting the runtime fiber (what
        // dispose does) interrupts them all and runs their finalizers. A
        // detached fork would outlive the runtime.
        const runtimeScope = yield* Effect.scope

        const { maybeHydrationRoot, resolveFlags } =
          yield* resolveHydrationHandoff({
            bootMode,
            hydration,
            bootFlags,
            configuredFlags,
            isFlagsRequired,
            FlagsCodec,
            preservedModel,
            container,
            buildId,
          })

        const maybePortChannels: Option.Option<PortChannelsBundle> = pipe(
          Option.fromNullishOr(ports),
          Option.map(portsConfig =>
            makePortChannels(portsConfig, maybeConnector),
          ),
        )

        yield* Option.match(
          Option.all({
            connector: maybeConnector,
            portChannels: maybePortChannels,
          }),
          {
            onNone: () => Effect.void,
            onSome: ({ connector, portChannels }) =>
              Effect.acquireRelease(
                Effect.sync(() => connector.bind(portChannels.deliverInbound)),
                () => Effect.sync(() => connector.unbind()),
              ),
          },
        )

        const {
          applicationContext,
          managedResourceRefs,
          provideAllResources,
          provideApplicationServices,
        } = yield* makeResourceProvider({
          managedResources,
          runtimeScope,
          maybePortChannels,
          applicationLayer,
        })

        const declaredComposition =
          runtimeInternals.get(program)?.compositionRoot
        if (declaredComposition !== undefined) {
          assertComposedHandlers(declaredComposition, applicationContext)
        }

        const ModelJsonCodec = Schema.toCodecJson(
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
          Model as Schema.Codec<Model>,
        )
        const decodePreservedModel = Schema.decodeUnknownExit(ModelJsonCodec)
        const encodePreservedModel = Schema.encodeUnknownExit(ModelJsonCodec)
        let isPreservationFailing = false

        const preserveCurrentModel = (
          model: Model,
          isReloadFlush: boolean,
        ): void =>
          Exit.match(encodePreservedModel(model), {
            onFailure: error => {
              preserveModel(runtimeId, undefined, isReloadFlush)

              if (!isPreservationFailing) {
                isPreservationFailing = true
                console.warn(
                  `[foldkit] Could not preserve Model for runtime "${runtimeId}". ` +
                    'The live Model is unchanged; the next development reload will initialize fresh. ' +
                    'Use JSON-capable Schemas for values that must survive a reload.',
                  error,
                )
              }
            },
            onSuccess: encodedModel => {
              isPreservationFailing = false
              preserveModel(runtimeId, encodedModel, isReloadFlush)
            },
          })

        const currentUrl: Option.Option<Url> = Option.fromNullishOr(
          routingConfig,
        ).pipe(Option.flatMap(() => urlFromString(window.location.href)))

        type InitResult = ReturnType<typeof init>

        // NOTE: a restored Model skips `init`, so resolving Flags on that path
        // would perform startup work only to discard what it produced. This
        // has to stay ahead of the preserve-scheduler and preservation
        // finalizers: a Flags Effect that fails after those are registered
        // tears down more than it used to, and their release defects would
        // bury its cause.
        const runInit: Effect.Effect<InitResult> = Effect.map(
          provideApplicationServices(resolveFlags),
          flags => init(flags, Option.getOrUndefined(currentUrl)),
        )

        const init_ = yield* preservedModel !== undefined
          ? Exit.match(decodePreservedModel(preservedModel), {
              onFailure: () => runInit,
              onSuccess: restoredModel =>
                Effect.succeed<InitResult>({ model: restoredModel }),
            })
          : runInit
        const initModelRaw = init_.model
        const initCommands = init_.commands ?? []

        // NOTE: keep `encodePreservedModel` off the dispatch hot path. It walks
        // the entire Model graph (O(modelSize) per call) and blocks input
        // on large Models. The scheduler defers encoding to a quiet window
        // and the `vite:beforeFullReload` flush covers the reload boundary.
        const PRESERVE_DEBOUNCE = Duration.millis(200)
        const preserveScheduler = yield* makePreserveScheduler<Model>(
          {
            onDebounce: model =>
              Effect.sync(() => preserveCurrentModel(model, false)),
            onFlush: model =>
              Effect.sync(() => preserveCurrentModel(model, true)),
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

        if (hot && isPreserveScrollActive) {
          yield* Effect.acquireRelease(
            Effect.sync(() => {
              const handler = (): void => preserveScrollPosition(runtimeId)
              hot.on('vite:beforeFullReload', handler)
              return handler
            }),
            handler =>
              Effect.sync(() => hot.off('vite:beforeFullReload', handler)),
          )
        }

        const schedulePreserveModel = (model: Model): Effect.Effect<void> =>
          hot ? preserveScheduler.schedule(model) : Effect.void

        const status = makeRuntimeStatus()

        // NOTE: `processMessagePlain` and `crashWith` are defined further
        // down, so they are wrapped here instead of passed by reference. The
        // queue has to exist before the navigation listeners attach below,
        // and reading a `const` before its line has run throws. The type
        // annotation is needed too: the `crashWith` wrapper calls the
        // renderer's, and the renderer takes this queue, so without it
        // TypeScript cannot infer either one.
        const messageQueue: MessageQueue<
          Message,
          Effect.Effect<Option.Option<number>>
        > = yield* makeMessageQueue<
          Message,
          Effect.Effect<Option.Option<number>>
        >({
          status,
          processMessage: message => processMessagePlain(message),
          crashWith: (cause, maybeMessage) => crashWith(cause, maybeMessage),
        })
        const {
          enqueueMessage,
          enqueueMessageEffect,
          enqueueMessageReceiptEffect,
          completeBoot,
        } = messageQueue

        const initModel = maybeFreezeModel(initModelRaw)

        const modelPubSub = yield* PubSub.unbounded<Model>()
        let composition: CompositionRuntime<Model> | undefined
        const enqueuePreparedDispatch = (
          message: Message,
          isCurrent?: () => boolean,
        ): Effect.Effect<Result.Result<Option.Option<number>, string>> =>
          Effect.flatMap(
            enqueueMessageReceiptEffect(message, isCurrent),
            Result.match({
              onFailure: (
                reason,
              ): Effect.Effect<Result.Result<Option.Option<number>, string>> =>
                Effect.succeed(Result.fail(reason)),
              onSuccess: (
                maybeRecording,
              ): Effect.Effect<Result.Result<Option.Option<number>, string>> =>
                Option.match(maybeRecording, {
                  onNone: () =>
                    Effect.succeed(Result.succeed(Option.none<number>())),
                  onSome: recording => Effect.map(recording, Result.succeed),
                }),
            }),
          )
        const prepareDispatch = (message: unknown) => {
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
          const decodedMessage = message as Message
          if (composition === undefined) {
            return Result.succeed(enqueuePreparedDispatch(decodedMessage))
          }

          const isCurrent = composition.externalMessageGuard(decodedMessage)
          return isCurrent === undefined
            ? Result.fail(
                'Rejected stale child Message: its placement, key, or generation does not identify the currently active occurrence.',
              )
            : Result.succeed(enqueuePreparedDispatch(decodedMessage, isCurrent))
        }
        const devToolsIntegration = yield* makeDevToolsIntegration<
          Model,
          Message,
          Resources
        >({
          devTools,
          update,
          maybeFreezeModel,
          prepareDispatch,
          provideDispatchServices: provideApplicationServices,
        })
        const {
          isRecordingCommands,
          installDevToolsStore,
          recordInit,
          recordMessage,
          recordCommandResult,
        } = devToolsIntegration

        let nextCommandId = 0
        const assignCommandIds = <
          CommandType extends Readonly<{
            name: string
            args?: Record<string, unknown>
          }>,
        >(
          commands: ReadonlyArray<CommandType>,
        ) =>
          Array.map(commands, command => ({
            id: nextCommandId++,
            command,
          }))

        if (import.meta.hot) {
          yield* Effect.addFinalizer(() =>
            Effect.sync(() => duplicateIdScanner?.cancel()),
          )
        }

        if (routingConfig) {
          yield* Effect.acquireRelease(
            Effect.sync(() =>
              addNavigationEventListeners(enqueueMessage, routingConfig),
            ),
            removeNavigationEventListeners =>
              Effect.sync(() => removeNavigationEventListeners()),
          )
        }

        // NOTE: the Model is plain closure state. `processMessagePlain`
        // reads and writes it directly, and the render side (the frame, and
        // `crashWith` inside its `Effect.sync`) reads it synchronously
        // through `readLiveModel`, so no Ref is needed.
        let liveModel: Model = initModel

        // NOTE: the runtime context for OnMount forking and Command forking
        // is captured once here; it is constant for the lifetime of the
        // runtime.
        const nativeRuntimeContext = Context.merge(
          yield* Effect.context<never>(),
          applicationContext,
        )
        const compositionRoot = runtimeInternals.get(program)?.compositionRoot
        const runtimeContext: Context.Context<never> =
          compositionRoot === undefined
            ? nativeRuntimeContext
            : (composition = yield* makeCompositionRuntime({
                block: compositionRoot,
                initModel,
                context: nativeRuntimeContext,
                runtimeScope,
                enqueueMessage,
                maybeSlowSubscriptionDependencies,
                crashWith: (cause, message) => crashWith(cause, message),
              })).context

        const {
          crashWith,
          render,
          setLastDirtyMessage,
          scheduleRenderFrame,
          skipPendingViewTransition,
          devToolsRenderBridge,
        } = yield* makeRenderer<Model, Message>({
          status,
          container,
          view,
          htmlBuilder,
          manageDocument,
          crash,
          buildId,
          initModel,
          maybeHydrationRoot,
          maybeSlowView,
          maybeSlowPatch,
          duplicateIdScanner,
          maybeResolvedViewTransition,
          commitNotifier,
          mounts: mounts ?? [],
          runtimeContext,
          readLiveModel: () => liveModel,
          messageQueue,
          devToolsIntegration,
        })

        yield* Effect.addFinalizer(() =>
          Effect.forEach(
            pipe(dialogIds, Array.fromIterable, Array.reverse),
            releaseDialogResources,
            { discard: true },
          ),
        )

        // NOTE: the fork is deferred one microtask so a Command's Effect
        // never begins on the dispatching stack. Commands are facts from
        // outside the update loop; their results always arrive
        // asynchronously, exactly as under the old queue. The fork runs
        // through `Effect.runForkWith` (which starts its fiber
        // synchronously, so the child is registered in `runtimeScope`
        // before this callback returns), not `Effect.runSyncWith`:
        // `runSyncWith` injects a temporary synchronous scheduler into the
        // fiber context, the child would inherit it, and every later yield
        // in the Command (for example, an op-budget suspension, or a
        // Stream step) would reschedule through clamped `setTimeout`
        // instead of the browser microtask scheduler carried by
        // `runtimeContext`.
        const forkCommand = (
          command: AnyCommand<
            Message,
            never,
            Resources | ManagedResourceServices
          >,
          message: Option.Option<Message>,
          id?: number,
          origin?: CapturedInvocation,
        ): void => {
          const captured = origin ?? composition?.capture(command)
          if (composition !== undefined && captured === undefined) {
            return
          }
          queueMicrotask(() => {
            // NOTE: `isCrashed` as well as `isRuntimeDisposed`. A crash is
            // terminal but does not dispose the runtime, and a Command forked
            // by a Message processed just before the crashing Message sits in
            // this microtask when the crash view paints. Without the crash
            // check its effect would run behind the crash view, contradicting
            // the crash-terminality contract. `crashWith` sets `isCrashed`
            // synchronously, so it is already set by the time this runs.
            if (status.isRuntimeDisposed || status.isCrashed) {
              return
            }

            const providedCommand = (
              captured === undefined
                ? provideAllResources(command.effect)
                : Effect.provideContext(
                    command.effect,
                    Context.makeUnsafe<Resources | ManagedResourceServices>(
                      captured.context.mapUnsafe,
                    ),
                  )
            ).pipe(
              Effect.withSpan(command.name, {
                attributes: command.args ?? {},
              }),
            )
            const mapResult = captured?.mapResult
            const deliveredCommand =
              mapResult === undefined
                ? providedCommand
                : providedCommand.pipe(Effect.map(result => mapResult(result)))
            const recordedCommand =
              id !== undefined
                ? deliveredCommand.pipe(
                    Effect.tap(result =>
                      Effect.sync(() => recordCommandResult(id, result)),
                    ),
                  )
                : deliveredCommand

            Effect.runForkWith(runtimeContext)(
              Effect.forkIn(captured?.scope ?? runtimeScope)(
                recordedCommand.pipe(
                  Effect.flatMap(result =>
                    enqueueMessageEffect(result, captured?.isCurrent),
                  ),
                  Effect.catchCause(cause => crashWith(cause, message)),
                ),
              ),
            )
          })
        }

        const processMessagePlain = (
          message: Message,
        ): Effect.Effect<Option.Option<number>> => {
          const currentModel = liveModel

          const [messageUpdate, maybeUpdateDuration] = measureSlowPhase(
            maybeSlowUpdate,
            () => update(currentModel, message),
          )
          const nextModelRaw = messageUpdate.model
          const commands = messageUpdate.commands ?? []
          const nextModel = maybeFreezeModel(nextModelRaw)
          const commandOrigins = new Map<object, CapturedInvocation>()
          if (composition !== undefined) {
            for (const command of commands) {
              if (
                !commandInstances(command).some(
                  frame => frame.isInitialization === true,
                )
              ) {
                const origin = composition.capture(command)
                if (origin !== undefined) {
                  commandOrigins.set(command, origin)
                }
              }
            }
          }

          reportSlowPhase<SlowUpdateContext<Model, Message>>(
            maybeSlowUpdate,
            maybeUpdateDuration,
            (durationMs, thresholdMs) => ({
              _tag: 'Update',
              previousModel: currentModel,
              nextModel,
              message,
              durationMs,
              thresholdMs,
            }),
          )

          if (currentModel !== nextModel) {
            liveModel = nextModel
            composition?.synchronize(nextModel)
            setLastDirtyMessage(message)
            PubSub.publishUnsafe(modelPubSub, nextModel)
            if (import.meta.hot) {
              Effect.runSync(schedulePreserveModel(nextModel))
            }
            scheduleRenderFrame()
          }

          if (isRecordingCommands) {
            const commandInvocations = assignCommandIds(commands)

            for (const { command, id } of commandInvocations) {
              forkCommand(
                /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
                command as AnyCommand<
                  Message,
                  never,
                  Resources | ManagedResourceServices
                >,
                Option.some(message),
                id,
                commandOrigins.get(command),
              )
            }

            const recording = Effect.runForkWith(runtimeContext)(
              recordMessage(
                message,
                currentModel,
                nextModel,
                commandInvocations,
              ),
            )
            return Fiber.join(recording)
          } else {
            for (const command of commands) {
              forkCommand(
                /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
                command as AnyCommand<
                  Message,
                  never,
                  Resources | ManagedResourceServices
                >,
                Option.some(message),
                undefined,
                commandOrigins.get(command),
              )
            }
            return Effect.succeed(Option.none())
          }
        }

        yield* Effect.provideContext(
          installDevToolsStore(devToolsRenderBridge),
          runtimeContext,
        )

        const initRenderExit = yield* Effect.exit(
          render(initModel, Option.none()),
        )
        if (Exit.isFailure(initRenderExit)) {
          yield* crashWith(initRenderExit.cause, Option.none())
          // NOTE: suspend instead of returning. Completing would close the
          // runtime scope and tear down the crash view; the scope must stay
          // open until the runtime is interrupted (an embedded app's dispose)
          // or the document goes away.
          return yield* Effect.never
        }

        if (isPreserveScrollActive) {
          yield* restorePreservedScrollPosition(runtimeId)
        }

        const initCommandInvocations = isRecordingCommands
          ? assignCommandIds(initCommands)
          : []
        if (isRecordingCommands) {
          yield* recordInit(initModel, initCommandInvocations)
        }

        if (composition !== undefined) {
          yield* composition.start
        }

        if (composition === undefined) {
          yield* forkManagedResourceFibers({
            managedResourceRefs,
            initModel,
            modelPubSub,
            runtimeScope,
            enqueueMessageEffect,
            provideAllResources,
            crashWith,
          })
        }

        if (composition === undefined && subscriptions) {
          yield* forkSubscriptionFibers({
            subscriptions: aggregateSubscriptions(subscriptions),
            initModel,
            modelPubSub,
            runtimeScope,
            maybeSlowSubscriptionDependencies,
            enqueueMessageEffect,
            provideAllResources,
            crashWith,
          })
        }

        // NOTE: registered before the boot buffer drains, so an interrupt
        // landing anywhere after this yield tears down with the flag set
        // (finalizers are LIFO; this one runs before every
        // earlier-registered teardown, including the container-restoring
        // patch whose OnUnmount dispatches must be dropped). An interrupt
        // landing before this yield tears down with isBootComplete still
        // false, so every dispatch buffers and dies with the closure.
        // Either way no Message is processed against a closing runtime.
        yield* Effect.addFinalizer(() =>
          Effect.sync(() => {
            status.isRuntimeDisposed = true
            // NOTE: a transition outliving the runtime would keep animating
            // over a container the teardown is about to restore.
            skipPendingViewTransition()
          }),
        )

        // NOTE: init Commands fork as the last act of boot, exactly where
        // the old queue's drain loop used to start. Together with the
        // isBootComplete barrier this guarantees no Command result (or any
        // other Message) is processed until the init render has painted
        // initModel and every boot subsystem (DevTools store, Subscriptions,
        // ManagedResources, ports) is attached. forkCommand also defers each
        // start by a microtask, so a fully synchronous init Command still
        // delivers its result asynchronously.
        if (isRecordingCommands) {
          for (const { command, id } of initCommandInvocations) {
            forkCommand(
              /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
              command as AnyCommand<
                Message,
                never,
                Resources | ManagedResourceServices
              >,
              Option.none(),
              id,
            )
          }
        } else {
          for (const command of initCommands) {
            forkCommand(
              /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
              command as AnyCommand<
                Message,
                never,
                Resources | ManagedResourceServices
              >,
              Option.none(),
            )
          }
        }

        completeBoot()

        // NOTE: suspend forever. Messages are processed synchronously on
        // the dispatching stack and render frames run as plain rAF
        // callbacks, so this fiber's only remaining job is keeping the
        // runtime scope open until interruption (an embedded app's dispose)
        // or the document goes away.
        return yield* Effect.never
      }),
    ).pipe(
      Effect.provideService(RenderCommit, commitNotifier.service),
      Effect.provideService(DialogRuntime, {
        register: id => {
          dialogIds.add(id)
        },
        unregister: id => {
          dialogIds.delete(id)
        },
      }),
    )
  }

  const start = (preservedModel?: unknown): Effect.Effect<void> =>
    startWith(Option.none(), preservedModel, 'Fresh')

  const program: MakeRuntimeReturn<P, Flags, Resources, Kind> = {
    runtimeId,
    start,
    ports,
  }
  runtimeInternals.set(program, {
    startWith: (maybeConnector, preservedModel, bootMode, flags, buildId) =>
      startWith(maybeConnector, preservedModel, bootMode, flags, buildId),
    startWithApplicationLayer: (
      maybeConnector,
      preservedModel,
      bootMode,
      flags,
      buildId,
      applicationLayer,
    ) =>
      startWith(
        maybeConnector,
        preservedModel,
        bootMode,
        flags,
        buildId,
        applicationLayer,
      ),
    kind,
    embedLifecycle: {
      isEmbedActive: false,
      maybeActiveFiber: Option.none(),
    },
  })
  return program
}
