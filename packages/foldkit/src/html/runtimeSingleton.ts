import type { Context } from 'effect'

import { type BoundaryRegistry, createBoundaryRegistry } from './boundary.js'

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

/** The dispatch and runtime context a view renders under. A child Block
 *  instance renders under its own frame, whose dispatchers address its
 *  Messages to that instance and whose `messageMappers` record the same
 *  addressing for the Scene test harness. */
export type Frame = Readonly<{
  outerDispatch: DispatchSync
  mountOuterDispatch: DispatchSync
  mountRenderOwner: MountRenderOwner
  runtimeContext: Context.Context<never>
  boundaryRegistry: BoundaryRegistry
  messageMappers?: ReadonlyArray<(message: unknown) => unknown>
}>

const stack: Array<Frame> = []

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
 *  same registry across renders. When omitted (crash views, test helpers), a
 *  fresh empty registry is created. */
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
    runtimeContext,
    boundaryRegistry,
  })
}

/** Pushes a fully-specified frame, ignoring whatever is currently on the
 *  stack. A Block instance's view and the view-input callbacks it passes
 *  between parent and child run under the frame captured for their owner,
 *  regardless of what frame is active when they are invoked. Must be paired
 *  with {@link clearRuntime}. */
export const pushFrame = (frame: Frame): void => {
  stack.push(frame)
}

/** Pops the current frame, restoring whatever frame was previously active.
 *  Must be paired with a {@link setRuntime} or {@link pushFrame} on the
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
        'a `pushFrame` or `setRuntime` was not paired with `clearRuntime` ' +
        '(or vice versa) upstream.',
    )
  }
  stack.pop()
}

/** Returns the current frame's dispatcher. Throws when called outside of a
 *  runtime frame. */
export const requireDispatch = (): DispatchSync => requireFrame().outerDispatch

/** Returns the render-owned root dispatcher for Mount results. A live render
 *  supplies live dispatch, while a historical render supplies no-op dispatch
 *  for acquisitions owned by that replay. */
export const requireMountDispatch = (): DispatchSync =>
  requireFrame().mountOuterDispatch

/** Returns whether the current frame is rendering the live or replayed view. */
export const requireMountRenderOwner = (): MountRenderOwner =>
  requireFrame().mountRenderOwner

/** A function that, given a message, returns a thunk that dispatches it
 *  through the dispatcher captured at build time. */
export type UnmountResolver = (message: unknown) => () => void

/** Returns an {@link UnmountResolver} bound to the current frame. `OnUnmount`
 *  calls the resolver at build time to capture a dispatch thunk that does not
 *  depend on which frame is active when the element is torn down. Throws when
 *  called outside of a runtime frame. */
export const requireUnmountResolver = (): UnmountResolver => {
  const { outerDispatch } = requireFrame()
  return message => () => outerDispatch(message)
}

/** Returns the current frame's Message mappers (innermost first), or an
 *  empty array for a root frame. `OnMount` records this build-time snapshot
 *  for the Scene test harness, which replays it when the Mount is resolved.
 *  Returns `[]` when there is no active frame, mirroring the lazy tolerance of
 *  handler-free Html built outside a render. */
export const requireBoundaryMappers = (): ReadonlyArray<
  (message: unknown) => unknown
> => stack[stack.length - 1]?.messageMappers ?? []

/** Returns a resolver bound to the current frame's render owner. Mounts invoke
 *  it from their insert hook, so a cached VNode uses the dispatcher for the
 *  render that acquires it. */
export const requireMountDispatchResolver = (): MountDispatchResolver => {
  const frame = requireFrame()
  return {
    owner: frame.mountRenderOwner,
    resolve: () => frame.mountOuterDispatch,
  }
}

/** Returns the current runtime Effect Context, used by Mount integrations
 *  that fork message-producing Effects against the live runtime services. */
export const requireRuntimeContext = (): Context.Context<never> =>
  requireFrame().runtimeContext

/** Returns the current frame's registry. Throws when called outside of a
 *  runtime frame. */
export const requireBoundaryRegistry = (): BoundaryRegistry =>
  requireFrame().boundaryRegistry

/** Returns the full current frame. Throws when called outside of a runtime
 *  frame. */
export const getCurrentFrame = (): Frame => {
  const frame = stack[stack.length - 1]
  if (frame === undefined) {
    throw new Error(
      'Foldkit: getCurrentFrame called without an active runtime frame',
    )
  }
  return frame
}
