---
'foldkit': minor
---

**Breaking:** Rename the exported `SubscriptionDeps` struct on UI components to `SubscriptionDependencies`. Affects `Ui.Slider`, `Ui.VirtualList`, and `Ui.DragAndDrop`. Update every callsite that references the old name:

```ts
// before
Ui.Slider.SubscriptionDeps.fields['dragPointer']
Ui.VirtualList.SubscriptionDeps.fields['containerEvents']
Ui.DragAndDrop.SubscriptionDeps.fields['documentPointer']

// after
Ui.Slider.SubscriptionDependencies.fields['dragPointer']
Ui.VirtualList.SubscriptionDependencies.fields['containerEvents']
Ui.DragAndDrop.SubscriptionDependencies.fields['documentPointer']
```

By convention application code that names a local subscription dependency schema should also rename it from `SubscriptionDeps` to `SubscriptionDependencies` to match. The runtime API (`Subscription.makeSubscriptions`) accepts any schema name, so this convention change is not enforced by the types.
