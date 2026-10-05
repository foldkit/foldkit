---
'@foldkit/ui': minor
---

Add complete end-anchored and dynamic-height scrolling to VirtualList. Lists can target an index, stable key, pixel offset, or the end; align rows to the start, center, end, or nearest edge; follow appended content while the user remains at the end; preserve a stable row across prepend, removal, reorder, and resize; and measure rendered row heights from estimates. Initial targets wait for asynchronously supplied items, and per-item height estimates work as a top-level view input. VirtualList now owns its container lifecycle through a Mount, so new integrations do not need Subscription wiring.

VirtualList's Model now includes scroll-request, anchor, and measurement state, and its Message union includes container, row-measurement, and scroll-result variants. Consumers that construct a Model literal or match every Message must update those sites. Use `VirtualList.init` to create the Model; existing `subscriptions.containerEvents` wiring remains accepted as a no-op during migration.
