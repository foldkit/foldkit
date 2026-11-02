---
'@foldkit/ui': minor
---

Expose DragAndDrop keyboard pickup and target changes as `StartedKeyboardDrag` and `ChangedKeyboardTarget` OutMessages, for example to update a live-region announcement. `ChangedKeyboardTarget` carries the previous and next proposed container and index, and focus Commands are unchanged. Moving to the same target emits nothing.
