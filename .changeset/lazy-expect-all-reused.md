---
'foldkit': minor
---

Add `Lazy.expectAllReused` to `foldkit/test` to check lazy cache reuse. It renders a view twice with the same Model and throws an error if any lazy call misses its cache on the second render. The error identifies each miss by slot number, includes the key for keyed calls, and explains the reason. `ArgumentsChanged` also lists the changed argument indices. The helper throws if the second render makes no lazy calls. Test Models that render different memoized content separately, and test child views directly when an outer lazy cache hit skips them.
