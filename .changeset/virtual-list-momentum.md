---
'@foldkit/ui': minor
---

Support momentum-preserving history loading in VirtualList with configurable start padding and `informItemsPrependedFromStartPadding`. When the reserve covers a batch, the update replaces reserved space with prepended rows without changing the scroll position and absorbs their first measurements into the remaining padding. `replenishStartPadding` restores the runway after `EndedContainerScroll` so an unknown amount of history can load across consecutive gestures. Set `isFinalPage` on the actual last batch to remove unused reserve. Consumers can opt into `observeStartGestures` to receive upward gesture and scroll-end Messages.
