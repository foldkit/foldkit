import { Effect, Queue, Stream } from 'effect'

/** v4 adapter that mirrors the v3 `Stream.async(emit => cleanup)` shape.
 *
 * Wraps `Stream.callback` so callers can keep imperative setup/teardown:
 * register listeners, call `emit.single(value)` from within them, and return
 * an `Effect` (or void) that runs cleanup when the stream is dropped. */
export const fromEmit = <A>(
  register: (emit: {
    readonly single: (value: A) => void
  }) => Effect.Effect<unknown> | void,
): Stream.Stream<A> =>
  Stream.callback<A>(queue =>
    Effect.acquireRelease(
      Effect.sync(() => {
        const emit = {
          single: (value: A) => {
            Queue.offerUnsafe(queue, value)
          },
        }
        const cleanup = register(emit)
        return cleanup
      }),
      maybeCleanup =>
        maybeCleanup ? maybeCleanup : Effect.void,
    ).pipe(Effect.flatMap(() => Effect.never)),
  )
