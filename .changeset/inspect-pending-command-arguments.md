---
'foldkit': minor
---

Add `Story.Command.argsOf` and `Scene.Command.argsOf` for projecting the exact captured arguments from pending Command metadata by Definition source identity. Preserve qualified names, keys, Effect channels, resolver ambiguity, and caller-owned occurrence selection; return `Some(undefined)` for a matching argless Definition.
