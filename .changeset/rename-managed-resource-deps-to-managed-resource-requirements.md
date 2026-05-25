---
'foldkit': patch
---

Rename the `ManagedResourceDeps` generic type parameter on `ManagedResource.makeManagedResources` to `ManagedResourceRequirements`. Spells out the abbreviated `Deps` and aligns with the existing `modelToMaybeRequirements` callback name. The rename is positional, so application code that named its local schema `ManagedResourceDeps` continues to compile unchanged. By convention, rename local schemas to `ManagedResourceRequirements` to match.
