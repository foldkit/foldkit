---
'foldkit': minor
---

Expose keyed child Subscription and ManagedResource inspection templates on Bindings and completed Blocks. Select an exact occurrence in Scene tests with `Scene.Subscription.at(Binding, key, entry)` or `Scene.ManagedResource.at(Binding, key, entry)`.

The templates are passive metadata. Runtime still starts lifecycle entries from active graph occurrences, so inspecting a completed Block does not start a second Stream or resource lifetime. Scene reports an absent selected key and rejects a raw ManagedResource source that is ambiguous within a keyed registry.
