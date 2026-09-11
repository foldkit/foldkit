---
'foldkit': minor
---

Add `matchOrElse` to unions returned by `defineTaggedUnion` and `defineRouteUnion`. Selected variants receive narrowed handlers, while inferred calls narrow the fallback to the remaining variants. Both data-first and data-last calls preserve structurally refined input unions.
