import { Effect, Queue, Stream } from 'effect'

/** Local v3-style adapter around v4's Stream.callback. Mirrors the
 *  emit-based imperative shape (emit.single, emit.end + cleanup return)
 *  we still use in subscription files. To be removed once all sites are
 *  rewritten to Stream.callback directly. */
export const streamFromEmit = <A>(
  register: (emit: {
    readonly single: (value: A) => void
    readonly end: () => void
  }) => Effect.Effect<unknown> | void,
): Stream.Stream<A> =>
  Stream.callback<A>(queue =>
    Effect.acquireRelease(
      Effect.sync(() => {
        const emit = {
          single: (value: A) => {
            Queue.offerUnsafe(queue, value)
          },
          end: () => {
            Queue.endUnsafe(queue)
          },
        }
        return register(emit)
      }),
      maybeCleanup =>
        (maybeCleanup ? maybeCleanup : Effect.void) as Effect.Effect<unknown>,
    ).pipe(Effect.flatMap(() => Effect.never)),
  )
