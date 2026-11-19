---
'@foldkit/ui': minor
---

Add a `role` option to `DragAndDrop.droppable()` and `DragAndDrop.draggable()` so drop containers that are not lists keep their own role. `droppable()` always set `role="listbox"`, so spreading it onto a `<td>`, a grid cell, or a landmark region replaced that element's role and broke the structure around it.

`droppable(containerId, label, { role: 'Native' })` sets no role on the container, and `draggable({ ..., role: 'Native' })` sets no role on the item, so a `<button>` keeps its own. Without the option, both helpers set `role="listbox"` and `role="option"` as before. Keyboard drag and collision detection behave the same with either role.

```ts
h.td(
  [...DragAndDrop.droppable(cell.id, undefined, { role: 'Native' })],
  [
    h.button(
      [
        ...DragAndDrop.draggable(
          {
            model,
            toParentMessage,
            itemId,
            containerId: cell.id,
            index,
            role: 'Native',
          },
          h,
        ),
        h.Type('button'),
      ],
      [title],
    ),
  ],
)
```
