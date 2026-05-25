import type { Context } from 'effect'

import {
  type BoundaryId,
  type BoundaryRegistry,
  ROOT_BOUNDARY,
  createBoundaryRegistry,
  getOrCreateBoundaryDispatch,
} from './boundary.js'

/** Synchronous message dispatcher provided to view-time element constructors. */
export type DispatchSync = (message: unknown) => void

export type Frame = Readonly<{
  outerDispatch: DispatchSync
  runtimeContext: Context.Context<never>
  boundaryRegistry: BoundaryRegistry
  boundaryId: BoundaryId
}>

const stack: Array<Frame> = []

/** Pushes a new dispatch and runtime context onto the singleton stack. The
 *  runtime calls this before invoking a user `view`, and any test or
 *  framework helper that builds VNodes outside of a normal render uses the
 *  same pair. Nested calls are supported: each push must be matched by a
 *  paired {@link clearRuntime} so the previous frame is restored.
 *
 *  Optionally accepts a {@link BoundaryRegistry}; the runtime supplies the
 *  same registry across renders so Submodel wrap descriptors persist. When
 *  omitted (e.g. crash views, test helpers that don't use Submodels), a
 *  fresh empty registry is created. The frame starts in the root
 *  boundary. */
export const setRuntime = (
  dispatch: DispatchSync,
  runtimeContext: Context.Context<never>,
  boundaryRegistry: BoundaryRegistry = createBoundaryRegistry(),
): void => {
  stack.push({
    outerDispatch: dispatch,
    runtimeContext,
    boundaryRegistry,
    boundaryId: ROOT_BOUNDARY,
  })
}

/** Pushes a new frame that inherits the current frame's dispatch, context,
 *  and registry, but uses a different boundary. Used by `h.submodel` to
 *  enter a child Submodel's wrapping context. Must be paired with
 *  {@link clearRuntime}. */
export const pushBoundary = (boundaryId: BoundaryId): void => {
  const parent = stack[stack.length - 1]
  if (parent === undefined) {
    throw new Error(
      'Foldkit: pushBoundary called without an active runtime frame',
    )
  }
  stack.push({
    outerDispatch: parent.outerDispatch,
    runtimeContext: parent.runtimeContext,
    boundaryRegistry: parent.boundaryRegistry,
    boundaryId,
  })
}

/** Pushes a fully-specified frame, ignoring whatever is currently on the
 *  stack. Used by `h.submodel`'s slot-callback wrapping so the wrapped
 *  callback runs in the OUTER (parent) Submodel's context, regardless of
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
        '(or vice versa) upstream. Likely a bug in a custom Submodel ' +
        'integration or view-time helper.',
    )
  }
  stack.pop()
}

/** Returns the current dispatcher. For frames in the root boundary, this
 *  is the runtime's actual dispatch; for nested Submodel boundaries, this
 *  is a cached per-boundary dispatcher that applies the wrapping chain at
 *  event-fire time. Throws when called outside of a runtime frame. */
export const requireDispatch = (): DispatchSync => {
  const frame = stack[stack.length - 1]
  if (frame === undefined) {
    throw new Error(
      'Foldkit: html element constructors must be called inside a runtime-driven render',
    )
  }
  return getOrCreateBoundaryDispatch(
    frame.boundaryRegistry,
    frame.outerDispatch,
    frame.boundaryId,
  )
}

/** Returns the current runtime Effect Context, used by Mount integrations
 *  that fork message-producing Effects against the live runtime services. */
export const requireRuntimeContext = (): Context.Context<never> => {
  const frame = stack[stack.length - 1]
  if (frame === undefined) {
    throw new Error(
      'Foldkit: html element constructors must be called inside a runtime-driven render',
    )
  }
  return frame.runtimeContext
}

/** Returns the current frame's boundary registry and boundary id. Used by
 *  `h.submodel` to register wrapping descriptors and compute child
 *  boundary ids. Throws when called outside of a runtime frame. */
export const requireBoundary = (): Readonly<{
  registry: BoundaryRegistry
  boundaryId: BoundaryId
}> => {
  const frame = stack[stack.length - 1]
  if (frame === undefined) {
    throw new Error(
      'Foldkit: h.submodel must be called inside a runtime-driven render',
    )
  }
  return { registry: frame.boundaryRegistry, boundaryId: frame.boundaryId }
}

/** Returns the full current frame, used by `h.submodel` to snapshot the
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
