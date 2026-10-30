---
'@foldkit/ui': minor
---

Emit `Closed` from Menu when an open Menu closes without selecting an item, through keyboard, pointer, blur, backdrop, or a `RequestedClose` Message. Parents can coordinate related state by handling it with `menu.on({ Closed: ... })`. `Closed` is emitted when the Model changes, before animation and cleanup Commands finish. Selection emits only `Selected`, and closing an already closed Menu emits nothing.

```ts
...menu.on({
  Selected: (model, { value }) => selectAction(model, value),
  Closed: model => ({ model }),
})
```
