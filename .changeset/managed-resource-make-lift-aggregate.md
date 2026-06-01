---
'foldkit': minor
---

Rebuild the ManagedResource API around `make` / `lift` / `aggregate`, mirroring the Subscription primitives so lifecycle composition looks the same across every Foldkit primitive.

`ManagedResource.make<Model, Message>()(entry => ({ ... }))` declares a managed resources record. Each `entry(requirementsSchema, config)` inlines the requirements schema (usually `S.Option(...)`) next to its config, replacing the parallel `ManagedResourceDeps` struct that `makeManagedResources` required. The schema is positional for the same inference reason as `Subscription.make`. The service union is inferred from the `resource` tags; read it with `ManagedResource.ServicesOf<typeof managedResources>` instead of hand-maintaining it in parallel.

`ManagedResource.lift(childRecord)<Parent, Parent>({ toChildModel, toParentMessage })` lifts a child Submodel's managed resources into a parent through a single Model lens and a single Message wrap, the same shape as update delegation and `Subscription.lift`. Unlike `Subscription.lift`, `toChildModel` returns `Option<ChildModel>`: a managed resource already speaks in `Option` (`modelToMaybeRequirements` returns `Option.none()` to release), so a Submodel that is not mounted is just another `none` and releases the resource through the same channel. Lifted child requirements must therefore be `S.Option`-wrapped.

`ManagedResource.aggregate<Model, Message>()(...records)` combines records and throws at startup on duplicate keys, so a collision fails loudly rather than silently overriding.

There is deliberately no `persistent`: app-lifetime handles are the static `resources` Layer, which a "persistent managed resource" would only duplicate.

**Breaking:** `makeManagedResources(Deps)<Model, Message>(configs)` is removed. Migrate each record to `make`, lift child Submodels with `lift`, and combine multiple records with `aggregate`.
