---
'foldkit': minor
---

Add runtime-owned typed lazy composition to `Runtime.makeApplication` and `Runtime.makeElement`. A client-rendered application can load and activate another complete `update`, `view`, and `subscriptions` implementation after boot without restarting its Runtime or storing functions in its Model.

The new `lazyComposition` configuration declares a finite implementation set, a build identity, requested and accepted Model selectors, an Effect loader with string failures, and readiness/failure Message callbacks. `Runtime.CompositionIdentity` keeps build, key, and request identity serializable. Lifecycle Messages always go through the root update, which accepts only its current request. Root resource declarations stay fixed and every implementation shares the same Layer and ManagedResource scope.

Successful implementations remain available for historical replay until the Runtime is disposed. Restored accepted identity loads before the first render. Switching accepted identities cleans up the previous route Subscriptions before starting the next set, while the root configuration's application-wide Subscriptions remain alive. Failed imports do not retry until the Model requests a new identity. Missing accepted implementations and build mismatches fail explicitly rather than selecting a fallback.

Existing static configurations are unchanged. This channel is client-only: `Runtime.hydrate` rejects lazy composition, and experimental SSR/SSG callers must resolve their implementation statically before rendering. The routing example's `/lazy.html` page demonstrates a second implementation loaded through a dynamic import after boot.
