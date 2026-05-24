---
'foldkit': minor
---

Rename the Toast view-config `renderEntry` field to `entryToView` so it lines up with the `toView` / `toConfig` slot-callback family used across the rest of `Ui.*`.

### Migration

```ts
// Before
viewInputs: {
  renderEntry: (entry, handlers) => h.div(...),
}

// After
viewInputs: {
  entryToView: (entry, handlers) => h.div(...),
}
```
