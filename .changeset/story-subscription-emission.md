---
'foldkit': minor
'create-foldkit-app': patch
---

Add `Story.Subscription.emit(source, message)` to Block-aware Stories. The selected graph supplies the registrations, validates source identity and decoded payloads, and applies generated child delivery without running handlers or Streams.

Select child sources through `Story.Subscription.at(Binding, source)`, `at(Binding, key, source)`, or a checked nonempty Binding path. This distinguishes reused sources and reaches registries encapsulated by child implementation Layers. Binding relationships, keys and owning Blocks remain checked; exact registration identity is verified against the acquired graph. Update-only Stories retain `Story.Subscription.from(registry).emit`.
