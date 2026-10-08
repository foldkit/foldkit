---
'@foldkit/ui': minor
---

Preserve momentum when VirtualList prepends items by allowing native scroll anchoring, rebasing delayed corrections to the latest viewport, and avoiding redundant scroll position writes. Keyed anchor restoration corrects positions when native anchoring cannot apply. Consumers can opt into `observeStartBoundaryGestures` to receive `StartedScrollTowardStartAtBoundary` when a new touch, wheel, or keyboard gesture requests earlier content at the physical start, where no scroll event occurs.
