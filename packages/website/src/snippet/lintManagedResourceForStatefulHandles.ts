// ❌ Bad
// A stateful browser handle created outside a lifecycle primitive leaks and
// escapes the Model.
let socket: WebSocket
const badConnect = (url: string) => {
  socket = new WebSocket(url)
}

// ✅ Good
// Scope the handle to a ManagedResource so it acquires and releases with the
// Model condition that needs it.
const socketResource = ManagedResource.make({
  acquire: (url: string) => new WebSocket(url),
  release: connection => connection.close(),
})
