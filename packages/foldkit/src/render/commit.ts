import { Array, Context } from 'effect'

// COMMIT SIGNAL

/**
 * @internal The runtime's post-commit signal, read by {@link afterCommit} and
 * {@link afterPaint} so they wait on an actual patch rather than counting
 * animation frames.
 *
 * Frame counting only lines up with the patch while the runtime commits
 * inside its own `requestAnimationFrame` callback. A frame that renders
 * inside `document.startViewTransition` hands its patch to the browser's
 * update callback, which fires later, so a waiter counting frames resumes
 * against the pre-patch DOM. Waiting on this service instead keeps the
 * guarantee true no matter when the runtime chooses to commit.
 *
 * Read through `Effect.serviceOption`, so it is never a requirement: Effects
 * built outside a runtime (tests, standalone helpers) see no service and fall
 * back to the frame-counting behavior.
 */
export class RenderCommit extends Context.Service<
  RenderCommit,
  {
    readonly isCommitPending: () => boolean
    readonly onNextCommit: (callback: () => void) => () => void
  }
>()('@foldkit/RenderCommit') {}

/** @internal The runtime's half of {@link RenderCommit}: the service value to
 *  provide, plus the two calls that drive it. */
export type CommitNotifier = Readonly<{
  service: typeof RenderCommit.Service
  markCommitPending: () => void
  notifyCommitted: () => void
}>

/**
 * @internal Builds a {@link CommitNotifier} for one runtime. Each runtime owns
 * its own, so a commit in one embedded application never wakes a waiter inside
 * another.
 *
 * `markCommitPending` is called when a render frame is scheduled and
 * `notifyCommitted` once the patch has applied. Every path that abandons a
 * scheduled frame without patching (disposal, crash, DevTools pause) must also
 * call `notifyCommitted`, or a waiter registered against that frame never
 * resumes.
 */
export const createCommitNotifier = (): CommitNotifier => {
  let isPending = false
  const callbacks = new Set<() => void>()

  return {
    service: {
      isCommitPending: () => isPending,
      onNextCommit: callback => {
        callbacks.add(callback)
        return () => {
          callbacks.delete(callback)
        }
      },
    },
    markCommitPending: () => {
      isPending = true
    },
    // NOTE: the callback set is snapshotted and cleared before any callback
    // runs, so a waiter that registers from within a resumed Effect waits for
    // the next commit rather than being invoked by this one.
    notifyCommitted: () => {
      isPending = false
      const notified = Array.fromIterable(callbacks)
      callbacks.clear()
      notified.forEach(callback => callback())
    },
  }
}
