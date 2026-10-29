---
'foldkit': minor
---

Add `h.Indeterminate(boolean)` for showing a checkbox as mixed, such as a select-all box when only some rows are selected. The mixed state exists only as the `indeterminate` DOM property, which has no HTML attribute, and the builder had no way to set it, so a view had to reach for a Mount to write the property by hand.

```ts
h.input([
  h.Type('checkbox'),
  h.Checked(isEveryRowSelected),
  h.Indeterminate(isSomeRowSelected && !isEveryRowSelected),
  h.OnClick(Message.ClickedSelectAll()),
])
```

`h.Indeterminate` is controlled the same way `h.Checked` is. Foldkit reasserts the value the view declares after every render, so a click that clears the property in the browser yields to whatever the next view says, and removing the attribute clears the property. Server rendering omits the property because HTML cannot express it, and hydration applies it on the client.
