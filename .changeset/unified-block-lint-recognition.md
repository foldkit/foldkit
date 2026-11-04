---
'@foldkit/oxlint-plugin': patch
---

Recognize `Block.make` declarations and their extracted helpers throughout the Block authoring rules. Require the public `<Id>Block` name, track child ownership through portable builders, and distinguish pure producers from deferred Command, Mount, Subscription, and ManagedResource handlers inside construction Layers.
