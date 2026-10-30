---
'foldkit': minor
---

Add `disposeAsync` to the `EmbedHandle` returned by `Runtime.embed`. `dispose` interrupts the runtime and returns before the cleanup has finished, so a host that wanted to start something afterwards, such as embedding a different program in the same container, had no way to know when it was safe. `disposeAsync` starts the same disposal and returns a Promise that resolves once Subscriptions, ManagedResources, and in-flight Commands have released, including any asynchronous release, and the rendered DOM is removed with the container restored. It is safe to call more than once, and after `dispose`.

A Mount is interrupted when its element is removed, but `disposeAsync` does not wait for the Mount's own release. `dispose` behaves as before.
