---
'foldkit': minor
---

DevTools now pre-attributes each Command to its destination Submodel. A Command crosses to DevTools before its Effect resolves, so the destination is recovered from the `Command.mapMessage` / `Command.mapMessages` lifts recorded on it: the chain is folded over a probe leaf and reduced to a serializable `submodelPath` of `Got*Message` wrapper tags from outer to inner. `CommandRecord` and the serialized wire shape now carry this `submodelPath` (empty for a top-level Command). Unlike a history entry there is no `maybeLeafTag`, because the Command's result Message does not exist until its Effect resolves.
