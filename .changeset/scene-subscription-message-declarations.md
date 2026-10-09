---
'foldkit': minor
---

Restrict Scene's `Subscription.emit` to Messages declared by the Scene's registered Subscriptions. Pass the Subscription record into `scene({ update, view, subscriptions }, ...steps)`. Named entries declare their emitted Message schemas; inline entries can declare them with a `messages` collection too. Scenes without registered Subscriptions cannot use `Subscription.emit`.

`Subscription.emit(message)` requires one matching registration. Use `Subscription.emit(subscriptions.ticks, message)` to select a specific registration when multiple Subscriptions declare the same Message. Registrations that need selection must use distinct entry objects. Reusing one entry object under multiple keys stays ambiguous because passing that object cannot identify a key; create a separate lifted entry for each path. Runtime validation checks the full declared schema before dispatch, including payloads, and rejects an entry that is not registered with the Scene.

For a lifted Subscription, emit its declared child Message. Scene applies the Subscription's child-to-parent mappings before passing the Message to update. Parent wrapper Messages must not be fabricated to bypass the child's declared Message contract. Preserve inferred registration records and use direct aggregation so their exact Message declarations remain available to the Scene type.

Inline entries without declarations remain available to the Runtime, but Scene cannot validate their emitted Messages. Migrate tests that used `Subscription.emit` to simulate a DOM interaction or Command result to the appropriate interaction or `Command.resolve` step.

`inside(parent, ...steps)` returns a typed step group that preserves nested Message declarations. Pass that group to `scene` or another `inside` group. Code that invoked the returned value as a simulation-transform function must instead include it in the Scene's step sequence.
