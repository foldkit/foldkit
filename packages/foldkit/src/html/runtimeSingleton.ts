import type { Context } from 'effect'

import type { ViewIdentity } from '../block/identity.js'
import {
  type InstanceFrame,
  enterHistoricalInstanceTree,
  guardInstanceDispatch,
} from '../block/instanceContext.js'
import { invocationContext } from '../block/scope.js'
import {
  type BoundaryId,
  type BoundaryRegistry,
  ROOT_BOUNDARY,
  boundaryMappers,
  createBoundaryRegistry,
  getOrCreateBoundaryDispatch,
  resolveBoundaryDispatchThunk,
  resolveMountBoundaryDispatch,
} from './boundary.js'

/** Synchronous Message dispatcher provided to view-time element constructors.
 * The optional guard suppresses dispatch after its captured occurrence is no
 * longer current. */
export type DispatchSync = (message: unknown, isCurrent?: () => boolean) => void

/** Identifies whether a Mount was acquired by the live view or a historical
 * test replay. */
export type MountRenderOwner = 'Live' | 'Replay'

/** Resolves the render-owned dispatcher for a Mount at insertion time. */
export type MountDispatchResolver = Readonly<{
  owner: MountRenderOwner
  resolve: () => DispatchSync
}>

export type Frame = Readonly<{
  outerDispatch: DispatchSync
  mountOuterDispatch: DispatchSync
  mountRenderOwner: MountRenderOwner
  runtimeContext: Context.Context<never>
  boundaryRegistry: BoundaryRegistry
  boundaryId: BoundaryId
  effectPath?: ReadonlyArray<string>
  viewIdentity?: ViewIdentity
}>

const stack: Array<Frame> = []
const frameDispatches = new WeakMap<
  Frame,
  Readonly<{
    boundaryDispatch: DispatchSync
    dispatch: DispatchSync
  }>
>()

const requireFrame = (): Frame => {
  const frame = stack[stack.length - 1]
  if (frame === undefined) {
    throw new Error(
      'Foldkit: html element constructors must be called inside a runtime-driven ' +
        'render. The element was built outside a view, or foldkit was loaded as ' +
        'more than one instance (a bundler split foldkit and @foldkit/ui into ' +
        'separate copies).',
    )
  }
  return frame
}

/** Pushes a new dispatch and runtime context onto the singleton stack. The
 *  runtime calls this before invoking a user `view`, and any test or
 *  framework helper that builds VNodes outside of a normal render uses the
 *  same pair. Nested calls are supported: each push must be matched by a
 *  paired {@link clearRuntime} so the previous frame is restored.
 *
 *  Optionally accepts a {@link BoundaryRegistry}; the runtime supplies the
 *  same registry across renders so Block wrap blocks persist. When
 *  omitted (e.g. crash views, test helpers that don't use Blocks), a
 *  fresh empty registry is created. The frame starts in the root
 *  boundary. */
export const setRuntime = (
  dispatch: DispatchSync,
  runtimeContext: Context.Context<never>,
  boundaryRegistry: BoundaryRegistry = createBoundaryRegistry(),
  mountRenderOwner: MountRenderOwner = 'Live',
): void => {
  stack.push({
    outerDispatch: dispatch,
    mountOuterDispatch: dispatch,
    mountRenderOwner,
    runtimeContext:
      mountRenderOwner === 'Replay'
        ? enterHistoricalInstanceTree(runtimeContext)
        : runtimeContext,
    boundaryRegistry,
    boundaryId: ROOT_BOUNDARY,
  })
}

/** Pushes a new frame that inherits the current frame's dispatch, context,
 *  and registry, but uses a different boundary. Used by `h.block` to
 *  enter a child Block's wrapping context. Must be paired with
 *  {@link clearRuntime}. */
export const pushBoundary = (
  boundaryId: BoundaryId,
  effectScope?: string,
  viewIdentity?: ViewIdentity,
  instance?: InstanceFrame,
): void => {
  const parent = stack[stack.length - 1]
  if (parent === undefined) {
    throw new Error(
      'Foldkit: pushBoundary called without an active runtime frame',
    )
  }
  stack.push({
    ...parent,
    boundaryId,
    ...(viewIdentity === undefined ? {} : { viewIdentity }),
    ...(effectScope === undefined
      ? {}
      : {
          runtimeContext: invocationContext(
            effectScope,
            parent.runtimeContext,
            instance,
            parent.mountRenderOwner === 'Replay',
          ),
          effectPath: [
            ...(parent.effectPath ?? []),
            `${effectScope}${instance?.key === undefined ? '' : `[${JSON.stringify(instance.key)}]`}`,
          ],
        }),
  })
}

/** Pushes a fully-specified frame, ignoring whatever is currently on the
 *  stack. Used by `h.block`'s slot-callback wrapping so the wrapped
 *  callback runs in the OUTER (parent) Block's context, regardless of
 *  what frame is active at the time the callback is invoked.
 *
 *  Unlike {@link pushBoundary} (which inherits dispatch/registry/context
 *  from the current top), this lets the caller capture a full frame
 *  snapshot at one point and replay it later. Without this primitive, a
 *  slot callback invoked from a deferred context (setTimeout, Promise,
 *  stored callback) would inherit from whatever render's frame happens
 *  to be on the stack at the time, silently mis-binding dispatch and
 *  registry. Must be paired with {@link clearRuntime}. */
export const pushFrame = (frame: Frame): void => {
  stack.push(frame)
}

/** Pops the current frame, restoring whatever frame was previously active.
 *  Must be paired with a {@link setRuntime} or {@link pushBoundary} on the
 *  same call stack, including via `try`/`finally` so an exception inside
 *  view code does not leak the frame to subsequent renders.
 *
 *  Throws when called on an empty stack. That signals an unmatched
 *  push/pop pair somewhere upstream and would silently corrupt later
 *  renders if it slid by. */
export const clearRuntime = (): void => {
  if (stack.length === 0) {
    throw new Error(
      'Foldkit: clearRuntime called on an empty runtime stack. This means ' +
        'a `pushBoundary` or `setRuntime` was not paired with `clearRuntime` ' +
        '(or vice versa) upstream. Likely a bug in a custom Block ' +
        'integration or view-time helper.',
    )
  }
  stack.pop()
}

/** Returns the current dispatcher. For frames in the root boundary, this
 *  is the runtime's actual dispatch; for nested Block boundaries, this
 *  is a cached per-boundary dispatcher that applies the wrapping chain at
 *  event-fire time. Throws when called outside of a runtime frame. */
export const requireDispatch = (): DispatchSync => {
  const frame = requireFrame()
  const boundaryDispatch = getOrCreateBoundaryDispatch(
    frame.boundaryRegistry,
    frame.outerDispatch,
    frame.boundaryId,
  )
  const cached = frameDispatches.get(frame)
  if (cached?.boundaryDispatch === boundaryDispatch) {
    return cached.dispatch
  }

  const dispatch = guardInstanceDispatch(frame.runtimeContext, boundaryDispatch)
  frameDispatches.set(frame, { boundaryDispatch, dispatch })
  return dispatch
}

/** Returns the render-owned root dispatcher for Mount results. A live render
 *  supplies live dispatch, while a historical render supplies no-op dispatch
 *  for acquisitions owned by that replay. */
export const requireMountDispatch = (): DispatchSync => {
  return requireFrame().mountOuterDispatch
}

/** Returns whether the current frame is rendering the live or replayed view. */
export const requireMountRenderOwner = (): MountRenderOwner => {
  return requireFrame().mountRenderOwner
}

/** A function that, given a message, resolves it through the current
 *  boundary's wrapping chain immediately and returns a thunk that dispatches
 *  the fully wrapped root message. */
export type UnmountResolver = (message: unknown) => () => void

/** Returns an {@link UnmountResolver} bound to the current frame's boundary.
 *  `OnUnmount` calls the resolver at build time (boundary alive) to capture a
 *  dispatch thunk that does not depend on what the registry holds when the
 *  element is torn down. Throws when called outside of a runtime frame. */
export const requireUnmountResolver = (): UnmountResolver => {
  const frame = requireFrame()
  return message =>
    resolveBoundaryDispatchThunk(
      frame.boundaryRegistry,
      guardInstanceDispatch(frame.runtimeContext, frame.outerDispatch),
      frame.boundaryId,
      message,
    )
}

/** Returns the current frame's Block wrapping chain (innermost first), or an
 *  empty array at the root boundary. `OnMount` records this build-time snapshot
 *  for the Scene test harness, which replays the chain when the Mount is
 *  resolved. Production Mount dispatch uses the ownership-aware resolver below.
 *  Returns `[]` when there is no active frame, mirroring the lazy tolerance of
 *  handler-free Html built outside a render. */
export const requireBoundaryMappers = (): ReadonlyArray<
  (message: unknown) => unknown
> => {
  const frame = stack[stack.length - 1]
  if (frame === undefined) {
    return []
  }
  return boundaryMappers(frame.boundaryRegistry, frame.boundaryId)
}

/** Returns a resolver bound to the current frame's render owner and Block
 *  boundary. Mounts invoke it from their insert hook, so a cached VNode uses
 *  the dispatcher for the render that acquires it. That dispatcher follows
 *  later wrapper registrations from the same owner without crossing between
 *  live and replay renders. */
export const requireMountDispatchResolver = (): MountDispatchResolver => {
  const frame = requireFrame()
  return {
    owner: frame.mountRenderOwner,
    resolve: () =>
      guardInstanceDispatch(
        frame.runtimeContext,
        resolveMountBoundaryDispatch(
          frame.boundaryRegistry,
          frame.mountOuterDispatch,
          frame.boundaryId,
        ),
      ),
  }
}

/** Returns the current runtime Effect Context, used by Mount integrations
 *  that fork message-producing Effects against the live runtime services. */
export const requireRuntimeContext = (): Context.Context<never> => {
  return requireFrame().runtimeContext
}

/** Returns the current frame's boundary registry and boundary id. Used by
 *  `h.block` to register wrapping blocks and compute child
 *  boundary ids. Throws when called outside of a runtime frame. */
export const requireBoundary = (): Readonly<{
  registry: BoundaryRegistry
  boundaryId: BoundaryId
}> => {
  const frame = stack[stack.length - 1]
  if (frame === undefined) {
    throw new Error(
      'Foldkit: h.block must be called inside a runtime-driven render',
    )
  }
  return { registry: frame.boundaryRegistry, boundaryId: frame.boundaryId }
}

/** Returns the full current frame, used by `h.block` to snapshot the
 *  parent's context before pushing a child boundary. The snapshot is
 *  captured into slot-callback closures so they can replay the parent's
 *  full frame via {@link pushFrame} when invoked, instead of inheriting
 *  from whatever happens to be on the stack at invocation time. Throws
 *  when called outside of a runtime frame. */
export const getCurrentFrame = (): Frame => {
  const frame = stack[stack.length - 1]
  if (frame === undefined) {
    throw new Error(
      'Foldkit: getCurrentFrame called without an active runtime frame',
    )
  }
  return frame
}

/** @internal Reads the current frame without requiring an active render. */
export const currentFrame = (): Frame | undefined => stack[stack.length - 1]

/** @internal Reads the composition path without requiring an active render. */
export const currentEffectPath = (): ReadonlyArray<string> =>
  stack[stack.length - 1]?.effectPath ?? []

/** @internal Reads a view's owner without requiring an active render. */
export const currentViewIdentity = (): ViewIdentity | undefined =>
  stack[stack.length - 1]?.viewIdentity
