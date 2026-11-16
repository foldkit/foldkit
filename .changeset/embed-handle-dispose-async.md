---
'foldkit': minor
---

Add `disposeAsync` to the `EmbedHandle` returned by `Runtime.embed`. It starts shutdown and returns a Promise that resolves after the runtime scope has closed and the original container has been restored. Await it before embedding a different program in the same container. It waits for Subscription, ManagedResource, and Command finalizers, including asynchronous release.

Mount finalizers run outside the runtime scope and may finish after the Promise resolves. A runtime finalizer that never completes keeps the Promise pending. Repeated calls await the same runtime, including calls after `dispose`. Runtime failures do not reject the returned Promise.
