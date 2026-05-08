---
'foldkit': minor
---

`Story.Command.resolveAll` and `Scene.Command.resolveAll` are now queue-only: every entry resolves exactly one matching dispatch in declaration order. Single entries no longer "stick" and resolve every matching dispatch with the same Message. To declare N identical responses, compose with `Array.makeBy(n, () => [Def, message])`.

This makes cardinality explicit at the call site and surfaces dispatch-count bugs as `assertAllCommandsResolved` failures instead of silent reuse.

Resolvers carry across `resolveAll` calls: unused entries can match later dispatches, and a new entry replaces any leftover resolvers sharing its Definition or Instance fingerprint (latest wins).
