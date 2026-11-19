---
'foldkit': minor
---

Type `members` on `defineTaggedUnion` and `defineRouteUnion` results as a non-empty readonly array, so callers that need a `readonly [Member, ...Member[]]` can use it without handling an empty list. `defineTaggedUnion` and `defineRouteUnion` now reject an empty cases object at compile time, and untyped calls throw.
