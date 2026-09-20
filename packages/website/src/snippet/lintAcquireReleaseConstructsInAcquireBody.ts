import { Effect } from 'effect'

const closeSocket = (socket: WebSocket) => Effect.sync(() => socket.close())

// ❌ Bad
// An interruption between constructing the socket and acquire leaks it.
const socket = new WebSocket('/updates')
const badResource = Effect.acquireRelease(Effect.succeed(socket), closeSocket)

// ✅ Good
// Construct the socket inside acquire, so acquire owns the whole lifetime.
const goodResource = Effect.acquireRelease(
  Effect.sync(() => new WebSocket('/updates')),
  closeSocket,
)
