---
'@foldkit/ui': minor
---

Add complete end-anchored and dynamic-height scrolling to VirtualList. Lists can target an index, stable key, pixel offset, or the end; align rows to the start, center, end, or nearest edge; follow appended content while the user remains at the end; preserve a stable row across prepend, removal, reorder, and resize; and measure rendered row heights from estimates. VirtualList now owns its container lifecycle through a Mount, so new integrations do not need Subscription wiring.
