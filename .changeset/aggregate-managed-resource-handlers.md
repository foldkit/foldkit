---
'foldkit': minor
---

Expose `managedResources.layer` on a closed registry returned by `Definition.makeManagedResources` when every entry has an attached lifecycle handler, matching Subscriptions. The aggregate preserves each handler's exact provided service, constructor error, and ordinary Service requirements. Empty registries provide `Layer.empty`.

Reserve the registry key `layer` for aggregate metadata and remove `ManagedResource.handlersLayer` without an alias. Rename an existing entry with that key. Mixed or host-owned registries expose no aggregate Layer; compose individual entry providers when selecting a subset or combining attached and host-owned handlers. Registry construction and Layer composition remain passive.
