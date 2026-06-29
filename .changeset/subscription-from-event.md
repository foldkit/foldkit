---
'foldkit': minor
---

Add `Subscription.fromEvent` to `foldkit`. It builds a Stream around a DOM
event source, registering the listener with `addEventListener` when the
Stream's scope opens and removing it when the scope closes. The
`addEventListener` call happens inside the acquire Effect and the matching
`removeEventListener` is registered only after acquire completes, so the
listener never leaks on interruption. Pass the `target` directly for
always-present globals like `window` or `document`, or as a thunk when it may
not exist until the scope opens. The `toMessage` mapper runs synchronously in
the browser's event dispatch, so `event.preventDefault()` works. Wrap the
result in `Stream.when` inside a `Subscription.make` entry to gate it on a
Model condition, or pass it to `Subscription.persistent` for a record-lifetime
listener.
