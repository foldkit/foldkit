---
'@foldkit/ui': minor
---

Add `DragAndDrop.maybeActiveDrop(model)`, which returns the drop that ending the drag now would report: the dragged item, the container and index it started at, and the current drop target, with the same fields as `Reordered`. Use it to highlight only the drop targets your `Reordered` handler would accept, during both pointer and keyboard drags, without matching on `DragState` to read where the drag started.
