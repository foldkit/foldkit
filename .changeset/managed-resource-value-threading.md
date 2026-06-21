---
'foldkit': minor
---

Thread the resource value type through `ManagedResource.make`. The value a resource holds is now inferred from the `resource` tag and used to type `acquire`'s result, `release`, and `onAcquired`, so a mismatch between what `acquire` produces and what the tag's `.get` yields is caught at compile time instead of passing as `any`.
