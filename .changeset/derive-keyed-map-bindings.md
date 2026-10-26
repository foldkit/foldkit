---
'foldkit': minor
---

Add `makeMapBinding` at `foldkit/mapBinding` to derive keyed child Bindings from required `Schema.Record` and Effect `Schema.HashMap` parent fields. Pass the parent Definition, child Block, and a config whose exact child values need only `field`; closed parent-owned wrappers add `childField`. The property or map key becomes the occurrence identity, generated Message key, and lifecycle key without requiring that identity inside the child Model.

Record adapters preserve own-property and JavaScript enumeration semantics and accept decoded string key Schemas. HashMap adapters use Effect's immutable lookup and replacement operations for string or number key Schemas, reject non-finite numeric occurrence values at runtime, and make no display-order promise. Both writers replace only existing entries, keep missing children absent, preserve wrapper fields, and retain keyed lifecycle, Subscription, Command, OutMessage, and stale-result behavior. Explicit `Binding.init` remains the insertion path.

Keep the general keyed form for custom parent write policy, ordering relationships, and composite HashMap keys that require a separate primitive Foldkit occurrence identity.

Only `makeMapBinding` selects map storage. An ordinary direct Binding whose complete child Model is itself a Record or HashMap remains a single child; collection shape alone does not change its identity or initialization policy.
