---
'foldkit': minor
---

Add an optional `nextModel` to `Lazy.expectAllReused` in `foldkit/test`. The helper renders `model` first and `nextModel` second, so tests can check that an unrelated Model change preserves lazy caches. Without `nextModel`, both renders use `model`. A cache miss during a transition names `nextModel` and reports the slot, key for keyed calls, reason, and changed argument indices for `ArgumentsChanged`.
