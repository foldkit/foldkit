---
'foldkit': patch
'@foldkit/vite-plugin': patch
---

Fix a stack overflow that crashed the app when DevTools serialized a Model or Message holding an Effect `Chunk`, for example a field declared with `Schema.Chunk(...)`. A Chunk's `left` and `right` fields lead to the empty Chunk, which refers to itself, so serialization never finished and the app logged `RangeError: Maximum call stack size exceeded`. DevTools shows a Chunk as an array of its elements.

The Vite plugin includes `effect/Chunk` in the Effect entries it prebundles, so the Chunk module DevTools imports joins the same optimized dependency graph as the application's Effect imports.
