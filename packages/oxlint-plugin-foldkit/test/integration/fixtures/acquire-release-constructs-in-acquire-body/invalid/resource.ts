import { Effect } from 'effect'

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
