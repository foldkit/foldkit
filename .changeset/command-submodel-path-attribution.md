---
'foldkit': minor
---

DevTools now attributes a Command to its destination Submodel from the actual resolved Message, without replaying Message mappers. Command history records and serialized Commands carry `maybeSubmodelPath`: `None` until resolution, `Some([])` for a top-level result, or `Some(tags)` for a Submodel result. Consumers constructing `CommandRecord` must add an invocation `id` and `maybeSubmodelPath`; consumers constructing a serialized Command must add `maybeSubmodelPath`.
