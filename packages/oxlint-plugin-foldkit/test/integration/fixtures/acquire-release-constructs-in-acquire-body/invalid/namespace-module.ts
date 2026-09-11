import * as Fx from 'effect/Effect'

declare const socket: WebSocket
declare const closeSocket: (socket: WebSocket) => Fx.Effect<void>

export const namespaceModule = Fx.acquireRelease(
  Fx.succeed(socket),
  closeSocket,
)
