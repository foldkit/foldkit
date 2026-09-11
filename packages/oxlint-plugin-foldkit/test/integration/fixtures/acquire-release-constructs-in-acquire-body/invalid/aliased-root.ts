import { Effect as Fx } from 'effect'

declare const socket: WebSocket
declare const closeSocket: (socket: WebSocket) => Fx.Effect<void>

export const aliasedRoot = Fx.acquireRelease(
  Fx.sync(() => socket),
  closeSocket,
)
