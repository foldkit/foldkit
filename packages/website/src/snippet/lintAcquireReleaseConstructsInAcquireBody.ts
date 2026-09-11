import { Effect } from 'effect'

// ❌ Bad
// An interruption between constructing the socket and acquire leaks it.
const badResource = Effect.acquireRelease(
  Effect.sync(() => socket),
  closeSocket,
)

// ✅ Good
// Construct the socket inside acquire, so acquire owns the whole lifetime.
const goodResource = Effect.acquireRelease(
  Effect.sync(() => new WebSocket(url)),
  closeSocket,
)
