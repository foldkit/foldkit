import type { Context } from 'effect'

/** Synchronous message dispatcher provided to view-time element constructors. */
export type DispatchSync = (message: unknown) => void

type Frame = Readonly<{
  dispatch: DispatchSync
  runtimeContext: Context.Context<never>
}>

const stack: Array<Frame> = []

/** Pushes a new dispatch and runtime context onto the singleton stack. The
 *  runtime calls this before invoking a user `view`, and any test or framework
 *  helper that builds VNodes outside of a normal render uses the same pair.
 *  Nested calls are supported: each push must be matched by a paired
 *  {@link clearRuntime} so the previous frame is restored. */
export const setRuntime = (
  dispatch: DispatchSync,
  runtimeContext: Context.Context<never>,
): void => {
  stack.push({ dispatch, runtimeContext })
}

/** Pops the current frame, restoring whatever frame was previously active.
 *  Must be paired with a {@link setRuntime} on the same call stack, including
 *  via `try`/`finally` so an exception inside view code does not leak the
 *  frame to subsequent renders. */
export const clearRuntime = (): void => {
  stack.pop()
}

/** Returns the current dispatcher. Throws when called outside of a runtime
 *  frame, which catches the common mistake of calling html element
 *  constructors at module load before the runtime has started. */
export const requireDispatch = (): DispatchSync => {
  const frame = stack[stack.length - 1]
  if (frame === undefined) {
    throw new Error(
      'Foldkit: html element constructors must be called inside a runtime-driven render',
    )
  }
  return frame.dispatch
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
