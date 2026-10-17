---
'foldkit': minor
---

Add `Lazy.expectAllReused` to `foldkit/test`. It renders a view twice with the same Model and fails when a `createLazy` or `createKeyedLazy` slot rebuilds, listing each slot, its key, and why it missed its cache.
