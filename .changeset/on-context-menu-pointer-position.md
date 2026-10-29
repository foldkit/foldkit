---
'foldkit': minor
---

`h.OnContextMenu` accepts a function in place of a Message, so a context menu can open at the pointer or depend on which part of an element was right-clicked. Foldkit calls the function with a `PointerPosition` and the event's `KeyboardModifiers`, then dispatches the Message it returns. `PointerPosition`, exported from `foldkit/html`, has the viewport `clientX` and `clientY`, plus `elementX`, `elementY`, `elementWidth`, and `elementHeight` measured against the element that carries the handler.

```ts
h.OnContextMenu(({ clientX, clientY }) =>
  Message.OpenedRowMenu({ rowId, clientX, clientY }),
)
```

Scene's `contextMenu` step takes an optional second argument with the `PointerPosition` fields and modifier keys the handler should receive.
