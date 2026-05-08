---
'foldkit': patch
---

Fix `Story.Command.resolveAll` silently dropping all but the first dispatch when multiple entries shared a `CommandDefinition` or instance fingerprint. Repeated entries within a single `resolveAll` call now form a queue: each entry is consumed by exactly one matching dispatch in declaration order. Single-entry resolvers remain sticky and are reused for every matching dispatch in the cascade.
