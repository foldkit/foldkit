import { Cause, Context, Effect, Exit, Option, type Scope } from 'effect'

import {
  drainOutlines,
  drainPatchOutlines,
  shouldRecordOutline,
} from '../html/boundary.js'
import {
  type BoundaryRegistry,
  type Document,
  type HtmlBuilder,
  __beginRender as beginHtmlRender,
  __beginReplayRender as beginReplayHtmlRender,
  __clearRuntime as clearHtmlRuntime,
  __createBoundaryRegistry as createHtmlBoundaryRegistry,
  __endReplayRender as endReplayHtmlRender,
  __flushReplayUnmountsAfterPatchFailure as flushReplayUnmountsAfterPatchFailure,
  __setRuntime as setHtmlRuntime,
} from '../html/index.js'
import { DEVTOOLS_OVERLAY_RUNTIME_ID } from '../html/index.js'
import { __hydrateVNode } from '../hydrate.js'
import { FOLDKIT_APP_ATTRIBUTE } from '../hydrationMarker.js'
import { MountRuntime, MountTracker } from '../mount/index.js'
import { OUTLINE_CUSTOM_EVENT, type OutlineRect } from '../outline/public.js'
import type { CommitNotifier } from '../render/commit.js'
import {
  VNode,
  __patchVNode,
  __recoverVNodeAfterPatchFailure,
} from '../vdom.js'
import {
  type CrashConfig,
  type VNodeSlot,
  noOpDispatch,
  renderCrashView,
} from './crashUI.js'
import type {
  DevToolsIntegration,
  DevToolsRenderBridge,
} from './devToolsIntegration.js'
import { Dispatch } from './dispatch.js'
import { applyDocumentMetadata } from './documentMetadata.js'
import type { DuplicateIdScanner } from './duplicateIdScanner.js'
import type { MessageQueue } from './messageQueue.js'
import type { RuntimeStatus } from './runtimeStatus.js'
import {
  type ResolvedSlowPhaseConfig,
  type SlowPatchContext,
  type SlowViewContext,
  measureSlowPhase,
  reportSlowPhase,
} from './slowPhase.js'
import {
  type StartViewTransition,
  type ViewTransitionConfig,
  type ViewTransitionHandle,
  __decideViewTransition,
  __silenceViewTransitionRejections,
} from './viewTransition.js'

/** The `viewTransition` config resolved against the running browser: the
 *  predicate, the feature-detected `startViewTransition`, and the cached
 *  reduced-motion query. Absent (the runtime holds `Option.none()`) when the
 *  app did not configure `viewTransition` or the browser lacks the API. */
export type ResolvedViewTransition<Model, Message> = Readonly<{
  decide: ViewTransitionConfig<Model, Message>
  startViewTransition: StartViewTransition
  reducedMotionQuery: MediaQueryList
}>

type RenderMode = 'Live' | 'Replay'

type PendingViewTransition = Readonly<{
  handle: ViewTransitionHandle
  update: {
    isInvalidated: boolean
    didRun: boolean
  }
}>

/**
 * What the boot closure uses from the render side. `crashWith` paints the
 * crash view and stops the runtime, `render` runs one live render (the boot
 * calls it for the first paint), `setLastDirtyMessage` records the Message
 * the next frame is attributed to, `scheduleRenderFrame` asks for a frame,
 * `skipPendingViewTransition` cuts short a transition the browser is still
 * animating, and `devToolsRenderBridge` is what the DevTools store needs to
 * repaint during time travel.
 */
export type Renderer<Model, Message> = Readonly<{
  crashWith: (
    cause: Cause.Cause<never>,
    maybeMessage: Option.Option<Message>,
  ) => Effect.Effect<void>
  render: (
    model: Model,
    maybeMessage: Option.Option<Message>,
  ) => Effect.Effect<void>
  setLastDirtyMessage: (message: Message) => void
  scheduleRenderFrame: () => void
  skipPendingViewTransition: () => void
  devToolsRenderBridge: DevToolsRenderBridge
}>

/**
 * Builds the render side of one runtime: the current vnode and, when
 * hydrating, the server-rendered root the first render adopts, the crash
 * renderer, the `Dispatch` service the view binds handlers to, the
 * synchronous render that runs the view and patches the DOM, the render
 * frame that runs in `requestAnimationFrame`, and the View Transition
 * that frame may run inside. It also registers the teardown finalizer
 * that patches the tree away and restores the container, so build it
 * before forking the perpetual fibers: scope finalizers run
 * last-registered first, and the container must be restored only after
 * those fibers are interrupted.
 */
export const makeRenderer = <Model, Message>({
  status,
  container,
  runtimeId,
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
  runtimeContext,
  readLiveModel,
  messageQueue,
  devToolsIntegration,
}: Readonly<{
  status: RuntimeStatus
  container: HTMLElement
  runtimeId: string
  view: (model: Model, h: HtmlBuilder<Message>) => Document
  htmlBuilder: HtmlBuilder<Message>
  manageDocument: boolean
  crash: CrashConfig<Model, Message> | undefined
  buildId: string | undefined
  initModel: Model
  maybeHydrationRoot: Option.Option<HTMLElement>
  maybeSlowView: Option.Option<
    ResolvedSlowPhaseConfig<SlowViewContext<Model, Message>>
  >
  maybeSlowPatch: Option.Option<
    ResolvedSlowPhaseConfig<SlowPatchContext<Model, Message>>
  >
  duplicateIdScanner: DuplicateIdScanner | undefined
  maybeResolvedViewTransition: Option.Option<
    ResolvedViewTransition<Model, Message>
  >
  commitNotifier: CommitNotifier
  runtimeContext: Context.Context<never>
  readLiveModel: () => Model
  messageQueue: MessageQueue<Message>
  devToolsIntegration: DevToolsIntegration<Model, Message>
}>): Effect.Effect<Renderer<Model, Message>, never, Scope.Scope> =>
  Effect.gen(function* () {
    const {
      enqueueMessage,
      enqueueMessageEffect,
      drainPendingMessages,
      resetDrainBudget,
    } = messageQueue
    const {
      mountTracker,
      mountRuntime,
      drainMountEvents,
      readViewState,
      setViewState,
      isPausedNow,
      resumeDevTools,
      attachRenderedMounts,
    } = devToolsIntegration

    const settlePendingCommit = (): void => {
      if (commitNotifier.service.isCommitPending()) {
        commitNotifier.notifyCommitted()
      }
    }

    // NOTE: `isRenderFrameScheduled` clears when the frame callback
    // starts, which on the View Transition path is before the patch runs.
    // `commitNotifier` tracks the patch itself, so `Render.afterCommit`
    // waits for the commit rather than for the frame that scheduled it.
    let isRenderFrameScheduled = false
    // NOTE: resume clears the DevTools store's pause flag before its frame
    // patches the live view. This distinguishes that intentional repaint
    // from an ordinary frame that was already queued when jumpTo installed
    // the historical view.
    let isLiveViewRestorePending = false

    // NOTE: the Model behind the DOM currently on screen, which is what a
    // View Transition animates away from. Seeded with `initModel` because
    // the init render paints it, and advanced only where a render actually
    // commits. The `viewTransition` predicate never runs before a Message
    // has dirtied the Model, and the init render completes behind the boot
    // barrier, so this is always the model of a paint that happened.
    let lastRenderedModel: Model = initModel

    // NOTE: the transition the browser is still animating, if any. Held so
    // the runtime can skip it: when a later frame supersedes it, when the
    // runtime crashes, and at teardown, where the browser would otherwise
    // animate over a released container. Declared above `crashWith`, which
    // calls the skip and can run as early as the init render.
    let maybePendingViewTransition = Option.none<PendingViewTransition>()

    const skipPendingViewTransition = (): void => {
      if (Option.isSome(maybePendingViewTransition)) {
        const { value: pendingViewTransition } = maybePendingViewTransition
        // NOTE: cleared first. An implementation that runs the update
        // callback synchronously would otherwise re-enter this.
        maybePendingViewTransition = Option.none()
        pendingViewTransition.update.isInvalidated = true
        try {
          pendingViewTransition.handle.skipTransition()
        } catch {
          // NOTE: skipping runs on teardown and crash paths, so a refusal
          // must not propagate into them.
        }
      }
    }

    // NOTE: the current vnode is plain closure state. The frame reads and
    // writes it directly; the cold paths that run inside Effects (crash
    // rendering, the dispose finalizer, the replay render) read the same
    // slot synchronously, so no Ref is needed.
    const vnodeSlot: VNodeSlot = { maybeCurrentVNode: Option.none() }

    const patchRuntimeVNode = (
      maybeCurrentVNode: Option.Option<VNode>,
      nextVNode: VNode | null,
      seen?: Set<object>,
      registry?: BoundaryRegistry,
    ): VNode => {
      try {
        return __patchVNode(
          maybeCurrentVNode,
          nextVNode,
          container,
          seen,
          patchedVNode => {
            vnodeSlot.maybeCurrentVNode = Option.some(patchedVNode)
          },
          registry,
        )
      } catch (error) {
        try {
          const maybeRecoveryVNode = vnodeSlot.maybeCurrentVNode
          if (Option.isSome(maybeRecoveryVNode)) {
            vnodeSlot.maybeCurrentVNode = Option.some(
              __recoverVNodeAfterPatchFailure(maybeRecoveryVNode.value),
            )
          }
        } finally {
          flushReplayUnmountsAfterPatchFailure()
        }
        throw error
      }
    }

    // NOTE: consumed by the first render only. Set when this boot found
    // an adoptable server-rendered root; the first patch then goes
    // through `__hydrateVNode` instead of replacing the container.
    let pendingHydrationRoot: HTMLElement | null =
      Option.getOrNull(maybeHydrationRoot)

    // NOTE: registered before any perpetual fiber is forked so it runs
    // after they are interrupted (scope finalizers are LIFO). Patching to
    // an empty tree fires snabbdom destroy hooks, which is what releases
    // Mounts; swapping the placeholder for the original container leaves
    // the host DOM as it was before the first render, ready for a fresh
    // embed of the same container. Gated on interruption: that is the
    // dispose path. A runtime that stops because it crashed completes
    // normally after rendering the crash view, and the crash view must
    // stay visible.
    yield* Effect.addFinalizer(exit =>
      Effect.gen(function* () {
        if (!Exit.hasInterrupts(exit)) {
          return
        }
        const maybeCurrentVNode = vnodeSlot.maybeCurrentVNode
        yield* Option.match(maybeCurrentVNode, {
          onNone: () => Effect.void,
          onSome: currentVNode =>
            Effect.sync(() => {
              const placeholderNode = __patchVNode(
                Option.some(currentVNode),
                null,
                container,
              ).elm
              if (placeholderNode && placeholderNode.parentNode) {
                placeholderNode.parentNode.replaceChild(
                  container,
                  placeholderNode,
                )
                container.replaceChildren()
              }
            }),
        })
      }),
    )

    // NOTE: shared by every crash path: the init render, the plain
    // message drain and render frame (which reach it through
    // `Effect.runFork` from their catch blocks), and the Command and
    // Subscription fibers (a Command's Effect and a Subscription's
    // Stream are typed with a `never` error channel, so a cause
    // escaping one can only be a `resources` Layer build failure or an
    // escaped defect, both unrecoverable). Each path catches its own
    // cause so a failure surfaces as the crash view instead of dying
    // silently and leaving the DOM frozen at the last successful
    // render. The first crash wins: concurrent Command fibers can fail
    // on the same broken Layer, and only one should report and render.
    const crashWith = (
      cause: Cause.Cause<never>,
      maybeMessage: Option.Option<Message>,
    ): Effect.Effect<void> =>
      Effect.sync(() => {
        if (status.isCrashed) {
          return
        }
        status.isCrashed = true
        // NOTE: the crash view should appear at once, not animate in from
        // a snapshot of the state that crashed.
        skipPendingViewTransition()
        const model = readLiveModel()
        const squashed = Cause.squash(cause)
        const error =
          squashed instanceof Error ? squashed : new Error(String(squashed))
        renderCrashView(
          { error, model, message: maybeMessage },
          crash,
          container,
          vnodeSlot,
          manageDocument,
        )
        settlePendingCommit()
      })

    // NOTE: `maybeLastDirtyMessage` holds the most recent dirtying Message,
    // so slow render-phase callbacks during high-rate bursts attribute to
    // the last Message in the frame batch, not the specific one that pushed
    // the view past threshold. Acceptable for a debug callback; full
    // attribution would require correlating each message with its render
    // contribution, which isn't worth the complexity.
    let maybeLastDirtyMessage = Option.none<Message>()

    const setLastDirtyMessage = (message: Message): void => {
      maybeLastDirtyMessage = Option.some(message)
    }

    const dispatchSync = (message: unknown): void => {
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      enqueueMessage(message as Message)
    }

    const dispatchAsync = (message: unknown): Effect.Effect<void> =>
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      enqueueMessageEffect(message as Message)

    const dispatch = { dispatchAsync, dispatchSync }

    // NOTE: One boundary registry per runtime instance, shared
    // across renders so Submodel wrap descriptors registered by
    // h.submodel persist between renders. The render function calls
    // `beginHtmlRender` at the start of each pass; wraps for
    // unmounted Submodels (e.g. an entry removed from a list) are
    // dropped from the registry via snabbdom destroy hooks attached
    // by `h.submodel` to each child vnode.
    const boundaryRegistry: BoundaryRegistry = createHtmlBoundaryRegistry()

    // NOTE: callers set `isRenderingFrame` before calling this and clear
    // it after. Without it, a Message dispatched while the patch is still
    // running would run update against a half-patched DOM. For a replay,
    // `render` also calls `beginReplayHtmlRender` first, so the old
    // tree's unmount callbacks don't dispatch into live history.
    const renderSync = (
      model: Model,
      maybeMessage: Option.Option<Message>,
      dispatchService: typeof Dispatch.Service,
      renderContext: Context.Context<never>,
      renderMode: RenderMode,
    ): void => {
      const maybeLiveRender = Option.liftPredicate(
        renderMode,
        mode => mode === 'Live',
      )
      const maybeLiveSlowView = Option.flatMap(
        maybeLiveRender,
        () => maybeSlowView,
      )
      const maybeLiveSlowPatch = Option.flatMap(
        maybeLiveRender,
        () => maybeSlowPatch,
      )
      const [nextDocument, maybeViewDuration] = measureSlowPhase(
        maybeLiveSlowView,
        () => {
          beginHtmlRender(boundaryRegistry)
          setHtmlRuntime(
            dispatchService.dispatchSync,
            renderContext,
            boundaryRegistry,
            renderMode,
          )

          try {
            return view(model, htmlBuilder)
          } finally {
            clearHtmlRuntime()
          }
        },
      )
      const { body: nextVNode } = nextDocument

      reportSlowPhase<SlowViewContext<Model, Message>>(
        maybeLiveSlowView,
        maybeViewDuration,
        (durationMs, thresholdMs) => ({
          _tag: 'View',
          model,
          message: maybeMessage,
          durationMs,
          thresholdMs,
        }),
      )

      const { maybeCurrentVNode } = vnodeSlot

      const [patchedVNode, maybePatchDuration] = measureSlowPhase(
        maybeLiveSlowPatch,
        () => {
          if (
            Option.isNone(maybeCurrentVNode) &&
            pendingHydrationRoot !== null
          ) {
            const hydrationRoot = pendingHydrationRoot
            pendingHydrationRoot = null
            // NOTE: strip the stamp before the patch, not after, so the
            // patch is the sole owner of the root's attributes. It has
            // already served its purpose of locating the root, and
            // removing it after would delete a `data-foldkit-app` the view
            // itself declares, which a later equal-vnode patch would not
            // restore. Removing it here also stops a later boot on the same
            // container (a dispose-then-embed remount) from re-detecting
            // this now-consumed root as hydratable.
            hydrationRoot.removeAttribute(FOLDKIT_APP_ATTRIBUTE)
            // An empty id reaches the adoption step's own check as a
            // value that matches nothing. Boot already refused a
            // hydration without an id, so this stands in only for a
            // caller that reached here another way.
            return __hydrateVNode(
              hydrationRoot,
              nextVNode,
              boundaryRegistry.dedupeSeen,
              buildId ?? '',
            )
          }
          return patchRuntimeVNode(
            maybeCurrentVNode,
            nextVNode,
            boundaryRegistry.dedupeSeen,
            boundaryRegistry,
          )
        },
      )
      vnodeSlot.maybeCurrentVNode = Option.some(patchedVNode)

      reportSlowPhase<SlowPatchContext<Model, Message>>(
        maybeLiveSlowPatch,
        maybePatchDuration,
        (durationMs, thresholdMs) => ({
          _tag: 'Patch',
          model,
          message: maybeMessage,
          durationMs,
          thresholdMs,
        }),
      )

      if (manageDocument) {
        applyDocumentMetadata(nextDocument, patchedVNode.elm)
      }

      if (import.meta.hot) {
        duplicateIdScanner?.schedule(patchedVNode.elm)
      }
    }

    // NOTE: `dispatchService` defaults to live dispatch but is overridable
    // so a time-travel render can bind both declarative handlers and newly
    // acquired Mounts to `noOpDispatch`. A live Mount keeps its dispatcher
    // across replay, while a replay-created Mount stays muted until a live
    // resume patch releases it and starts the live action. This preserves
    // valid async results from live Mounts without granting a historical
    // acquisition access to the live Model.
    const render = (
      model: Model,
      maybeMessage: Option.Option<Message>,
      dispatchService: typeof Dispatch.Service = dispatch,
      renderMode: RenderMode = 'Live',
    ) =>
      Effect.gen(function* () {
        status.isRenderingFrame = true
        const renderContext = yield* Effect.context<never>()
        if (renderMode === 'Replay') {
          beginReplayHtmlRender()
        }
        renderSync(
          model,
          maybeMessage,
          dispatchService,
          renderContext,
          renderMode,
        )
      }).pipe(
        Effect.ensuring(
          Effect.sync(() => {
            status.isRenderingFrame = false
            endReplayHtmlRender()
            drainPendingMessages()
          }),
        ),
        Effect.provideService(Dispatch, dispatchService),
        Effect.provideService(MountTracker, mountTracker),
        Effect.provideService(MountRuntime, mountRuntime),
      )

    const liveRenderContext = Context.add(
      Context.add(
        Context.add(runtimeContext, Dispatch, dispatch),
        MountTracker,
        mountTracker,
      ),
      MountRuntime,
      mountRuntime,
    )

    // NOTE: drains the outline entries recorded during the view and
    // patch phases and publishes them as one batch on `window`, which
    // the DevTools overlay listens for. Skipped for the overlay's own
    // runtime so it never outlines itself.
    const flushOutlines = (): void => {
      const explicit = drainOutlines(boundaryRegistry)
      const patched = drainPatchOutlines(boundaryRegistry)
      const isOutlineEnabled =
        shouldRecordOutline() && runtimeId !== DEVTOOLS_OVERLAY_RUNTIME_ID
      if (!isOutlineEnabled) {
        return
      }
      const getTag = (value: unknown): string | undefined => {
        try {
          if (typeof value !== 'object' || value === null) {
            return undefined
          }
          if (!('_tag' in value)) {
            return undefined
          }
          const tag = Reflect.get(value, '_tag')
          return typeof tag === 'string' ? tag : undefined
        } catch (error) {
          void error
          return undefined
        }
      }
      const cause = Option.match(maybeLastDirtyMessage, {
        onNone: () => undefined,
        onSome: getTag,
      })
      const rects: Array<OutlineRect> = []
      const all =
        explicit.length !== 0
          ? patched.length !== 0
            ? [...explicit, ...patched]
            : explicit
          : patched
      for (const entry of all) {
        let elm: Element | null = null
        const rawElm = entry.vnode.elm
        if (rawElm instanceof Element) {
          elm = rawElm
        } else if (rawElm instanceof Text) {
          elm = rawElm.parentElement
        } else if (rawElm instanceof Node) {
          const rawChildren = entry.vnode.children
          const children: ReadonlyArray<unknown> = globalThis.Array.isArray(
            rawChildren,
          )
            ? rawChildren
            : []
          for (const child of children) {
            if (typeof child !== 'object' || child === null) {
              continue
            }
            if (!('elm' in child)) {
              continue
            }
            const childElm = Reflect.get(child, 'elm')
            if (childElm instanceof Element) {
              elm = childElm
              break
            }
          }
        }
        if (!elm || !elm.isConnected) {
          continue
        }
        const rect = elm.getBoundingClientRect()
        if (rect.width === 0 && rect.height === 0) {
          continue
        }
        const id = 'patchId' in entry ? entry.patchId : entry.boundaryId
        rects.push({
          id,
          label: entry.label,
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          ...(cause !== undefined ? { cause } : {}),
        })
      }
      if (rects.length === 0) {
        const maybeRootElm = Option.flatMap(
          vnodeSlot.maybeCurrentVNode,
          vnode => {
            const elm = vnode.elm
            return elm instanceof Element
              ? Option.some(elm)
              : Option.none<Element>()
          },
        )
        const rootElm = Option.getOrElse(maybeRootElm, () => container)
        const rect = rootElm.getBoundingClientRect()
        if (rect.width !== 0 || rect.height !== 0) {
          rects.push({
            id: `root:${runtimeId}`,
            label: 'root',
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            ...(cause !== undefined ? { cause } : {}),
          })
        }
      }
      if (rects.length > 0) {
        window.dispatchEvent(
          new CustomEvent(OUTLINE_CUSTOM_EVENT, { detail: rects }),
        )
      }
    }

    // NOTE: the render, Mount drain, DevTools attribution, and
    // patch-time-buffer flush. Shared by the plain path (called directly)
    // and the View Transition path (called from the transition's update
    // callback), which run identical work; only whether they run inside
    // `document.startViewTransition` differs. `isRenderingFrame` gates the
    // buffering of Messages dispatched by patch-time hooks, so it must
    // wrap the actual patch, which on the transition path happens inside
    // the callback, not when the frame is scheduled.
    const runRenderFrameBody = (): void => {
      status.isRenderingFrame = true
      // NOTE: captured before the patch, because `drainPendingMessages`
      // below can advance the live Model again before the next frame reads
      // it. What this frame painted is what the next transition animates
      // away from.
      const renderedModel = readLiveModel()
      const isResuming = readViewState() === 'Paused'
      if (isResuming) {
        // NOTE: Messages accumulated while a historical view owned the DOM
        // did not cause this repaint. A Message arriving during the patch
        // can repopulate this field when the buffered queue drains.
        maybeLastDirtyMessage = Option.none()
      }
      try {
        renderSync(
          readLiveModel(),
          maybeLastDirtyMessage,
          dispatch,
          liveRenderContext,
          'Live',
        )
        // NOTE: after the patch, so a render that threw leaves this on the
        // Model still on screen, and before `drainPendingMessages` below,
        // whose handlers can advance the live Model again.
        lastRenderedModel = renderedModel
        flushOutlines()
        // NOTE: resume clears the store's pause flag before this frame.
        // Publish Live only after the live DOM has been installed.
        setViewState('Live')
        attachRenderedMounts()
      } catch (error) {
        Effect.runFork(crashWith(Cause.die(error), maybeLastDirtyMessage))
      } finally {
        status.isRenderingFrame = false
      }
      // NOTE: Messages dispatched by patch-time hooks (for example,
      // OnUnmount destroys, or Mount emissions) were buffered while the
      // frame held the stack; they process now, after the patch has
      // committed and the frame's Mount events are attributed.
      drainPendingMessages()
      // NOTE: last, so a waiter resumed by the commit observes the same
      // DOM and the same processed-Message ordering it saw when
      // `afterCommit` counted frames.
      settlePendingCommit()
    }

    // NOTE: starts a View Transition around this frame's render when the
    // `viewTransition` predicate matches, returning `true` when it did.
    // `startViewTransition` invokes its update callback asynchronously
    // after snapshotting the old DOM, so the callback reads the live Model
    // and `maybeLastDirtyMessage` fresh (the plain loop may have advanced
    // the model while the browser suppressed rendering) and re-checks the
    // disposal and crash guards, which can flip while the transition is
    // pending. The unconfigured path never reaches this function; the
    // `Option.isNone` check in `renderFramePlain` returns first, so a
    // runtime without `viewTransition` allocates no per-frame callback.
    const startFrameViewTransition = (
      resolved: ResolvedViewTransition<Model, Message>,
    ): boolean => {
      if (readViewState() === 'Paused') {
        return false
      }
      if (resolved.reducedMotionQuery.matches) {
        return false
      }
      if (Option.isNone(maybeLastDirtyMessage)) {
        return false
      }
      const maybeDecision = __decideViewTransition(resolved.decide, {
        previousModel: lastRenderedModel,
        model: readLiveModel(),
        message: maybeLastDirtyMessage.value,
      })
      if (Option.isNone(maybeDecision)) {
        return false
      }
      // NOTE: invalidate an older transition before this one takes
      // ownership of the latest live repaint. The browser may still call
      // the older update callback, but its invalidation guard leaves the
      // DOM and commit notifier to this transition.
      skipPendingViewTransition()
      try {
        const update = {
          isInvalidated: false,
          didRun: false,
        }
        const handle = resolved.startViewTransition(() => {
          if (update.isInvalidated || update.didRun) {
            return
          }
          update.didRun = true
          // NOTE: the view state closes the resume window after the
          // store is live but before its plain frame has restored the live
          // DOM. A transition invalidated by jumpTo stays invalid forever,
          // so its callback cannot repaint inside the stale transition
          // even if it arrives after resume has published `Live`.
          if (
            status.isRuntimeDisposed ||
            status.isCrashed ||
            isPausedNow() ||
            readViewState() === 'Paused'
          ) {
            settlePendingCommit()
            return
          }
          runRenderFrameBody()
        }, maybeDecision.value.maybeTypes)
        maybePendingViewTransition = Option.some({ handle, update })
        __silenceViewTransitionRejections(handle)
        return true
      } catch {
        // NOTE: an escaping throw would leave the rAF callback without a
        // patch and without settling the commit notifier, parking every
        // `Render.afterCommit` on this frame forever.
        return false
      }
    }

    // NOTE: every path out of a scheduled frame settles the commit
    // notifier, whether or not it patched. A frame abandoned silently
    // would strand any `Render.afterCommit` registered against it, and
    // the Dom helpers that gate on it would never run their DOM work.
    const renderFramePlain = (): void => {
      isRenderFrameScheduled = false
      const isRestoringLiveView = isLiveViewRestorePending
      isLiveViewRestorePending = false
      // NOTE: a frame scheduled before disposal fires after it; a
      // disposed runtime must not repaint the released container.
      if (status.isRuntimeDisposed) {
        settlePendingCommit()
        return
      }
      // NOTE: a frame is running, so the browser got control back; the
      // drain budget starts fresh.
      resetDrainBudget()
      // NOTE: a Message that dirtied the model can also be the one
      // whose Command crashed the runtime. Without this guard the
      // next animation frame would render the live view over the
      // crash view.
      if (status.isCrashed) {
        settlePendingCommit()
        return
      }
      if (isPausedNow()) {
        settlePendingCommit()
        return
      }
      if (readViewState() === 'Paused' && !isRestoringLiveView) {
        settlePendingCommit()
        return
      }
      // NOTE: the unconfigured path pays one `Option.isNone` check and
      // renders directly, allocating no per-frame callback. Only a
      // runtime configured with `viewTransition` reaches
      // `startFrameViewTransition`, which decides per frame whether to
      // wrap the render in `document.startViewTransition`. When it does,
      // the render runs later, inside the transition's update callback.
      if (Option.isNone(maybeResolvedViewTransition)) {
        runRenderFrameBody()
        return
      }
      if (!startFrameViewTransition(maybeResolvedViewTransition.value)) {
        runRenderFrameBody()
      }
    }

    // NOTE: render frames run as plain JavaScript inside the
    // requestAnimationFrame callback. Messages arriving between frames mark
    // at most one pending frame; the callback renders once with the latest
    // model.
    const scheduleRenderFrame = (
      isRestoringLiveView: boolean = false,
    ): void => {
      if (isRestoringLiveView) {
        isLiveViewRestorePending = true
      }
      if (isRenderFrameScheduled) {
        return
      }
      isRenderFrameScheduled = true
      commitNotifier.markCommitPending()
      requestAnimationFrame(renderFramePlain)
    }

    const devToolsRenderBridge: DevToolsRenderBridge = {
      // NOTE: passes `noOpDispatch` so declarative handlers and Mounts
      // acquired by the replay cannot reach the live Model. Their
      // fibers stay alive and can observe view-state changes while the
      // historical view owns them. If resume reuses such an element,
      // OnMount releases the replay acquisition before starting the
      // live action. Also discards mount events fired during the render
      // so they don't get attributed to the next user-initiated dispatch.
      renderReplay: model =>
        Effect.gen(function* () {
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
          const replayedModel = model as Model
          const previousRenderedModel = lastRenderedModel
          // NOTE: a Mount surviving from the live view must observe
          // Paused before the historical patch can expose different
          // DOM. Mounts inserted by that patch capture this state when
          // acquired, so asynchronous setup cannot skip Paused even if
          // it consumes the Stream only after the live view returns.
          setViewState('Paused')
          // NOTE: a transition still animating belongs to the live
          // state this replay is about to paint over. Left running it
          // animates a dead snapshot across the replayed DOM.
          skipPendingViewTransition()
          const replayRenderExit = yield* Effect.exit(
            render(replayedModel, Option.none(), noOpDispatch, 'Replay'),
          )
          if (Exit.isFailure(replayRenderExit)) {
            drainMountEvents()
            if (isPausedNow()) {
              // NOTE: the failed patch may already have changed the
              // DOM. Repaint the Model at the store's previous paused
              // index before returning the failure. If that Model no
              // longer renders either, resume the store so its normal
              // live frame becomes the single recovery path.
              const rollbackExit = yield* Effect.exit(
                render(
                  previousRenderedModel,
                  Option.none(),
                  noOpDispatch,
                  'Replay',
                ),
              )
              drainMountEvents()
              if (Exit.isFailure(rollbackExit)) {
                yield* resumeDevTools
              }
            } else {
              // NOTE: a failed first jump leaves the store live. Keep
              // Mounts Paused through the recovery patch, which
              // publishes Live only after the live DOM is restored.
              yield* Effect.sync(() => scheduleRenderFrame(true))
            }
            return yield* Effect.failCause(replayRenderExit.cause)
          }
          drainMountEvents()
          // NOTE: a replay render records outlines like a live one, but
          // no frame follows to flush them. Drain here so replay entries
          // never leak into the next live frame's batch.
          drainOutlines(boundaryRegistry)
          drainPatchOutlines(boundaryRegistry)
          // NOTE: a replay paints a past Model, so it owns the DOM on
          // screen until the next live frame. Leaving
          // `lastRenderedModel` on the pre-pause Model would hand the
          // `viewTransition` predicate a `previousModel` describing a
          // DOM that no longer exists, and the frame `resume`
          // schedules would animate the wrong direction out of the
          // wrong snapshot.
          lastRenderedModel = replayedModel
          // NOTE: the Message that dirtied the pre-pause frame does not
          // describe this repaint. Clearing it means the frame `resume`
          // schedules renders plainly, matching the documented rule
          // that time-travel never animates.
          maybeLastDirtyMessage = Option.none()
        }),
      // NOTE: `resume` calls this after a jumpTo render attached DOM
      // listeners to `noOpDispatch`. Scheduling a frame renders the
      // live model with live dispatch and rebinds listeners.
      markRenderPending: Effect.sync(() => scheduleRenderFrame(true)),
    }

    return {
      crashWith,
      render,
      setLastDirtyMessage,
      scheduleRenderFrame,
      skipPendingViewTransition,
      devToolsRenderBridge,
    }
  })
