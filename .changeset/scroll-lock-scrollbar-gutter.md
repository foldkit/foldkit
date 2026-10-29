---
'foldkit': patch
---

Stop `Dom.lockScroll` from shifting the page when it hides a scrollbar that takes up width.

Before, the lock set `padding-right` on the document element to the scrollbar's width. That shifted things in two cases. On a page whose root already reserves the gutter with `scrollbar-gutter: stable`, the gutter stays when the scrollbar hides, and the padding added a second scrollbar's width, so the content moved left by that width. And padding never held fixed-position elements in place: they sized to the wider viewport and moved right.

The lock now sets `scrollbar-gutter: stable` on the document element while it is held, which keeps the width reserved for both the page and fixed-position elements. It adds nothing when the root already has a stable gutter, or when the scrollbar is an overlay that takes no width. `Dom.unlockScroll` restores the original `scrollbar-gutter`, as it does `overflow`. Nested locks and the iOS `touchmove` handling are unchanged.
