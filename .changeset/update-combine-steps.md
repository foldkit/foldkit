---
'foldkit': minor
---

Rename `Update.combine` to `Update.combineSteps` to identify the pure Steps it composes. Replace both call directions:

```ts
// Before
Update.combine(model, [writeDraft, clearErrors])
const saveDraft = Update.combine([writeDraft, clearErrors])

// After
Update.combineSteps(model, [writeDraft, clearErrors])
const saveDraft = Update.combineSteps([writeDraft, clearErrors])
```

Each Step receives the Model produced by the previous Step. The helper collects the returned Commands without executing them; collection order does not sequence their effects or completion. The former export has no compatibility alias.
