---
'foldkit': minor
---

Add standard child Instances for string-keyed array storage. A child contract exposes its ready `{ key, model }` Schema as `Instance`. Its explicit Binding can create inert initialization requests that `makeFieldsStep` resolves through the registered graph before subsequent Steps. Ready Model snapshots contain no pending state, and child init Commands, requirements, routing, and occurrence cleanup use the existing Binding lifecycle.

Instance Bindings reserve `create` for occurrence initialization. Custom storage and other storage shapes retain the existing Binding initialization APIs.

Generic family member records also reserve `Instance`. Rename a custom member with that name before upgrading; source checks and runtime validation reject attempts to replace the declared Instance Schema.
