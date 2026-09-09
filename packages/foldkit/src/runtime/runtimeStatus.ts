/**
 * The three flags that gate Message processing and rendering. The boot
 * closure creates one per runtime and shares it with the units it builds,
 * so the unit that sets a flag and the units that read it see one value.
 * A plain mutable object rather than a Ref, because every reader and
 * writer runs synchronously on the main thread.
 */
export type RuntimeStatus = {
  // NOTE: a Message dispatched after the runtime scope closed, say an
  // OnUnmount fired by the dispose teardown patch or a stale DOM handler,
  // is dropped instead of updating a disposed runtime. The finalizer that
  // sets this is registered at the end of boot, so it runs before every
  // earlier-registered teardown step (finalizers are LIFO).
  isRuntimeDisposed: boolean
  // NOTE: the differ fires destroy and insert hooks while `patch` is on
  // the stack, and both can dispatch synchronously (for example, an
  // OnUnmount dispatch, or a Mount stream's synchronous first emission).
  // Draining inline would run update, and on a defect the crash renderer,
  // against a DOM the outer patch is still mutating. The frame buffers
  // such dispatches and drains them after it completes.
  isRenderingFrame: boolean
  // NOTE: a crash is terminal. Once this is set, the drain stops and
  // later dispatches are dropped, so update, Command forks, and DevTools
  // recording all stop with the crash view on screen.
  isCrashed: boolean
}

/** A fresh status: not disposed, not crashed, and no frame on the stack. */
export const makeRuntimeStatus = (): RuntimeStatus => ({
  isRuntimeDisposed: false,
  isRenderingFrame: false,
  isCrashed: false,
})
