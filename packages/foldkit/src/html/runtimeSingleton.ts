import type { Context } from 'effect'

import {
  ROOT_SCOPE,
  type ScopeId,
  type ScopeRegistry,
  createScopeRegistry,
  getOrCreateScopedDispatch,
} from './scope.js'

/** Synchronous message dispatcher provided to view-time element constructors. */
export type DispatchSync = (message: unknown) => void

type Frame = Readonly<{
  outerDispatch: DispatchSync
  runtimeContext: Context.Context<never>
  scopeRegistry: ScopeRegistry
  scopeId: ScopeId
}>

const stack: Array<Frame> = []

/** Pushes a new dispatch and runtime context onto the singleton stack. The
 *  runtime calls this before invoking a user `view`, and any test or
 *  framework helper that builds VNodes outside of a normal render uses the
 *  same pair. Nested calls are supported: each push must be matched by a
 *  paired {@link clearRuntime} so the previous frame is restored.
 *
 *  Optionally accepts a {@link ScopeRegistry}; the runtime supplies the
 *  same registry across renders so Submodel wrap descriptors persist. When
 *  omitted (e.g. crash views, test helpers that don't use Submodels), a
 *  fresh empty registry is created. The frame starts in the root scope. */
export const setRuntime = (
  dispatch: DispatchSync,
  runtimeContext: Context.Context<never>,
  scopeRegistry: ScopeRegistry = createScopeRegistry(),
): void => {
  stack.push({
    outerDispatch: dispatch,
    runtimeContext,
    scopeRegistry,
    scopeId: ROOT_SCOPE,
  })
}

/** Pushes a new frame that inherits the current frame's dispatch, context,
 *  and registry, but uses a different scope. Used by `h.submodel` to enter
 *  a child Submodel's wrapping context. Must be paired with
 *  {@link clearRuntime}. */
export const pushScope = (scopeId: ScopeId): void => {
  const parent = stack[stack.length - 1]
  if (parent === undefined) {
    throw new Error('Foldkit: pushScope called without an active runtime frame')
  }
  stack.push({
    outerDispatch: parent.outerDispatch,
    runtimeContext: parent.runtimeContext,
    scopeRegistry: parent.scopeRegistry,
    scopeId,
  })
}

/** Pops the current frame, restoring whatever frame was previously active.
 *  Must be paired with a {@link setRuntime} or {@link pushScope} on the
 *  same call stack, including via `try`/`finally` so an exception inside
 *  view code does not leak the frame to subsequent renders. */
export const clearRuntime = (): void => {
  stack.pop()
}

/** Returns the current dispatcher. For frames in the root scope, this is
 *  the runtime's actual dispatch; for nested Submodel scopes, this is a
 *  cached per-scope dispatcher that applies the wrapping chain at
 *  event-fire time. Throws when called outside of a runtime frame. */
export const requireDispatch = (): DispatchSync => {
  const frame = stack[stack.length - 1]
  if (frame === undefined) {
    throw new Error(
      'Foldkit: html element constructors must be called inside a runtime-driven render',
    )
  }
  return getOrCreateScopedDispatch(
    frame.scopeRegistry,
    frame.outerDispatch,
    frame.scopeId,
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

/** Returns the current frame's scope registry and scope id. Used by
 *  `h.submodel` to register wrapping descriptors and compute child scope
 *  ids. Throws when called outside of a runtime frame. */
export const requireScope = (): Readonly<{
  registry: ScopeRegistry
  scopeId: ScopeId
}> => {
  const frame = stack[stack.length - 1]
  if (frame === undefined) {
    throw new Error(
      'Foldkit: h.submodel must be called inside a runtime-driven render',
    )
  }
  return { registry: frame.scopeRegistry, scopeId: frame.scopeId }
}
