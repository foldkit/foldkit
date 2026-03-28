---
'foldkit': minor
---

Add Ui.DragAndDrop component with four-state drag state machine (Idle, Pending, Dragging, KeyboardDragging), document-level pointer and keyboard subscriptions, collision detection, ghost element positioning, and draggable/droppable attribute helpers.

Add subscription equivalence and readDependencies support: subscriptions can now provide a custom `equivalence` to control when dependency changes restart the stream, and `dependenciesToStream` receives a `readDependencies` callback for reading the latest dependencies without retriggering.
