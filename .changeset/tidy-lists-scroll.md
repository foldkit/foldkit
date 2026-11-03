---
'@foldkit/ui': patch
---

Preserve VirtualList's current visible row when native scrolling overlaps a layout change. Report a changed container width before the scroll observation, and accept the new native anchor when the scroll position has moved beyond the layout tolerance.
