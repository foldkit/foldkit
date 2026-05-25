---
'foldkit': patch
---

Faster view rendering. The HTML attribute matcher used to be built once per VNode inside `buildVNodeData`; it is now built once at module load and shared across every VNode. Both naive and optimised paths benefit; naive constructs the matcher per VNode, so the gain is largest there, while optimised still does matcher work on items that change between renders (cache misses).
