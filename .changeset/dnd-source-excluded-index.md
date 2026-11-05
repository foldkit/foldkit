---
'@foldkit/ui': minor
---

Correct pointer drop indexes to match the source-excluded destination slot already used by keyboard dragging. The preview and `Reordered.toIndex` now use the destination index after removing the source item. Cross-container indexes and no-op `Reordered` emission are preserved.

If your application compensates for the bug by subtracting one from same-container pointer destinations, remove that adjustment. Applications that remove the source item and insert it directly at `toIndex` need no change.
