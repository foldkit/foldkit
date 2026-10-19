declare const socket: WebSocket
declare const closeSocket: (socket: WebSocket) => void

const Effect = {
  acquireRelease: (acquire: unknown, release: unknown) => ({ acquire, release }),
  succeed: (value: unknown) => value,
  sync: (thunk: () => unknown) => thunk(),
}

export const shadowedSucceed = Effect.acquireRelease(
  Effect.succeed(socket),
  closeSocket,
)

export const shadowedSync = Effect.acquireRelease(
  Effect.sync(() => socket),
  closeSocket,
)
