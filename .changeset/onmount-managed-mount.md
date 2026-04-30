---
'foldkit': minor
---

Add `OnMount`, a lifecycle hook for mount-time async work that needs paired cleanup. It takes an `(element: Element) => Effect<Mount<Message>>`, dispatches the resulting Message, and stashes the cleanup. When Snabbdom unmounts the element, the runtime invokes the cleanup automatically. The new `Mount<Message>` type is exported from `foldkit/html`.

Use `OnMount` for third-party libraries that own their own DOM and need teardown: charting libraries, code editors, map renderers, force layouts. Compared to wiring `OnInsertEffect` and `OnDestroy` together with a module-level `WeakMap`, `OnMount` removes the element-keyed bookkeeping from user code.

Race-safe: if the element is unmounted while the Effect is still in flight, the cleanup runs as soon as it arrives and the Message is suppressed. Failures are logged via `console.error('[OnMount] unhandled failure', cause)` rather than crashing the app, mirroring `OnInsertEffect`.

`OnInsert`, `OnInsertEffect`, and `OnDestroy` are unchanged. Reach for `OnInsert` for fire-and-forget mount work, `OnInsertEffect` for async mount work that produces a Message but needs no cleanup, and `OnMount` for the paired-cleanup case.
