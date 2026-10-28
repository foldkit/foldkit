---
'@foldkit/ui': minor
---

Add `DragAndDrop.dragInstructions()` so screen reader users hear how to drag with the keyboard. Draggables had no description, so nothing told a screen reader user that Space or Enter starts a drag, or which keys move, drop, and cancel once it has started.

`dragInstructions(model)` renders a hidden element. Render it once per DragAndDrop instance and set `hasDragInstructions: true` in a `draggable()` config to point the draggable's `aria-describedby` at it. With no keyboard drag in progress, the text says to press Space or Enter to start dragging. During a keyboard drag, it names the arrow keys, Tab and Shift+Tab, Space or Enter, and Escape.

```ts
DragAndDrop.dragInstructions(model.dragAndDrop)

DragAndDrop.draggable(
  {
    model: model.dragAndDrop,
    toParentMessage,
    itemId: task.id,
    containerId: 'list',
    index,
    hasDragInstructions: true,
  },
  h,
)
```

An optional second argument, `{ idle, keyboardDragging }`, replaces either string, for example with a translation. `dragInstructionsId(model)` returns the element's id.
