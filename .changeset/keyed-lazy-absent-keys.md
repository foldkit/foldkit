---
'foldkit': minor
---

Make `createKeyedLazy()` release entries absent from the latest completed render by default. This bounds the keyed cache to entries used by that render. Cached parents preserve their children's entries, and cache writes roll back if view construction fails. Each runtime and server render has its own cache.

**Breaking change:** `createKeyedLazy()` and `createKeyedLazy({})` evict unused keys. If a bounded cache must reuse an entry after its key is absent from a render, migrate to `createKeyedLazy({ evict: 'None' })`. Explicit retention holds each cached VNode and its DOM element after that element leaves the document. Lists whose row identities can grow should use the default.
