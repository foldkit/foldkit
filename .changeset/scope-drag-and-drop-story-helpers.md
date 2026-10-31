---
'@foldkit/ui': patch
---

`DragAndDrop.test.settleFocus` and `DragAndDrop.test.resolveKeyboardMove` accept an optional `path` that selects the DragAndDrop instance by its path from the Story root, as in `Block.deliver`, so a Story with several DragAndDrop instances resolves the right one.
