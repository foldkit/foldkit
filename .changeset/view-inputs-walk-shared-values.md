---
'foldkit': patch
---

Passing an Effect `Chunk` through `h.submodel` as a `viewInputs` field could overflow the stack during rendering. The nested-function check followed the empty Chunk's self-references repeatedly. The check now expands each nested object or array at most once per call.

When the check finds a nested function, it reports its path. When several paths lead to the same object or array, the check reads its contents at the first visit. A getter on a shared object may therefore be read fewer times.
