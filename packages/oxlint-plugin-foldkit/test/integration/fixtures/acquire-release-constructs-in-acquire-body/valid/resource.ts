import { Effect } from 'effect'

declare const url: string
declare const closeSocket: (socket: WebSocket) => Effect.Effect<void>
declare const makeSocket: Effect.Effect<WebSocket>

// Constructs in place, so acquire owns the whole lifetime.
export const inPlace = Effect.acquireRelease(
  Effect.sync(() => new WebSocket(url)),
  closeSocket,
)

// A named acquire Effect is opaque here; the rule under-fires safely.
export const named = Effect.acquireRelease(makeSocket, closeSocket)
