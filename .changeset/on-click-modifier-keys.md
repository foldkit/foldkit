---
'foldkit': minor
---

`h.OnClick` accepts a function in place of a Message. Foldkit calls it with the `shiftKey`, `ctrlKey`, `altKey`, and `metaKey` state of the click, using the same `KeyboardModifiers` record the keyboard handlers receive, and dispatches the Message it returns. A view can now tell a Cmd-click or Shift-click apart from a plain click without tracking pointer presses in the Model.

```ts
h.OnClick(({ metaKey, ctrlKey }) =>
  Message.ClickedItem({ itemId, isExtendingSelection: metaKey || ctrlKey }),
)
```

The `defaultAction`, `propagation`, and `focusSelector` controls apply before the function is called, exactly as they do for a Message. Passing a Message is unchanged.

Scene's `click` step takes an optional second argument, `{ shiftKey, ctrlKey, altKey, metaKey }`, to hold modifier keys during the simulated click. Omitted keys are released.
