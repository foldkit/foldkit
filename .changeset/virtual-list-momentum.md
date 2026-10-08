---
'@foldkit/ui': minor
---

Support momentum-preserving history loading in VirtualList with configurable start padding and `informItemsPrependedFromStartPadding`. When the reserve covers a batch, the update replaces reserved space with prepended rows without changing the scroll position and absorbs their first measurements into the remaining padding. `replenishStartPadding` restores the runway after `EndedContainerScroll` so more history can load across consecutive gestures. Set `isFinalPage` on the actual last batch to remove unused reserve after scrolling settles. Consumers can opt into `observeStartGestures` to receive upward gesture and scroll-end Messages, with a scroll-idle fallback for browsers without `scrollend`. `AccessibleSet` reports loaded, unknown, or known partial collection positions to assistive technology.
