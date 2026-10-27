---
'foldkit': minor
'create-foldkit-app': patch
---

Add `makeInitIfMissingStep` to `foldkit/bindingInit` for retained children in direct-value Record and Effect HashMap Bindings:

```ts
const initEditorStep = (issue: typeof Issue.Type) =>
  makeInitIfMissingStep(EditorsBinding, {
    key: issue.id,
    args: [issue],
  })
```

The Binding supplies the storage field, exact key, and child init argument contract. Construction is passive. Applying the connected Step preserves the exact parent Model and emits no Commands for an existing key, or initializes and inserts the missing child with its init Commands. Both paths require the registered Binding.

Pass the Step directly to `Update.combineSteps` or a compatible update handler. Entity lookup and handling of unknown URL IDs stay in the application. Wrapped maps and custom accessors keep explicit initialization. `initAndInsert` rejects duplicate keys when insertion, rather than reuse, is intended.

Document this choice in the scaffold's Foldkit guidance. Use `init` in initialization function, helper, Step and file names, with `init...IfMissingStep` for conditional creation, throughout active examples and guidance.
