---
'foldkit': minor
'@foldkit/ui': minor
---

Rename the mapper in `Subscription.fromEvent` from `toMessage` to `mapEvent`, the mappers in `Subscription.fromEventFilterMap` and `Subscription.fromEventFilterMapPreventDefault` to `filterMapEvent`, and each `Subscription.keyBindings` binding's mapper to `mapEvent`. Update those config fields when upgrading. These helpers remain generic Streams: their output is inferred from the callback, and `Subscription.make` checks the final application Message type.

`Subscription.animationFrame` keeps `toMessage` because it returns a Subscription entry; `Subscription.lift` keeps `toParentMessage` because it maps a child Message to a parent Message. `@foldkit/ui` adopts the new event mapper field and requires the matching Foldkit release.
