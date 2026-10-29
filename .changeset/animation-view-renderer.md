---
'@foldkit/ui': minor
---

Replace Animation's raw `content: Html` ViewInput with the required `toView: () => Html` renderer. The renderer runs at the embedding view boundary, so nested event handlers use the parent's dispatcher.

```ts
// Before
viewInputs: {
  content: h.p([], ['Saved']),
}

// After
viewInputs: {
  toView: () => h.p([], ['Saved']),
}
```

Toast lifecycle tests now call `test.drainEntry` on the completed value returned by `Toast.makeBlock`. Pass the exact parent Binding so the helper retains the factory and composition path. The old module-level `Toast.test` namespace has been removed.

```ts
// Before
Toast.test.drainEntry({
  entryId: 'notifications-entry-0',
  waitBeforeDismissal: [WaitBeforeDismissal, completedTimer],
})

// After
ToastBlock.test.drainEntry({
  binding: ToastBinding,
  entryId: 'notifications-entry-0',
})
```

The helper drains only a freshly shown, non-sticky entry with its initial pending enter and auto-dismiss lifecycle. `version` defaults to `0`. A keyed Toast Binding requires its exact `key`; an unkeyed Binding rejects one. Use individual Command resolvers after hover, swipe, manual dismissal, or another transition has advanced the entry.
