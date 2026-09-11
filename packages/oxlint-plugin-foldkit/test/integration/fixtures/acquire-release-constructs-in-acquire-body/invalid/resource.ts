import { Effect } from 'effect'
import {
  acquireRelease as acquire,
  succeed as succeedWith,
  sync as lazily,
} from 'effect/Effect'

declare const socket: WebSocket
declare const closeSocket: (socket: WebSocket) => Effect.Effect<void>

// Returns a handle captured from an outer binding.
export const fromSync = Effect.acquireRelease(
  Effect.sync(() => socket),
  closeSocket,
)

// Lifts a pre-existing handle as-is.
export const fromSucceed = Effect.acquireRelease(
  Effect.succeed(socket),
  closeSocket,
)

// The factory call still runs eagerly before Effect.succeed receives it.
export const eagerFactory = Effect.acquireRelease(
  Effect.succeed(new WebSocket('ws://example.test')),
  closeSocket,
)

export const aliasedSync = acquire(lazily(() => socket), closeSocket)

export const aliasedSucceed = acquire(succeedWith(socket), closeSocket)
