---
'@foldkit/oxlint-plugin': minor
---

Detect more Submodel boundary violations in parent update functions

The recommended preset gains `no-direct-submodel-state-update` and `require-fold-for-child-update-result`. The first reports nested `evo` changes to a child Model field when an in-file fold identifies that field as a Submodel on the same parent Model. The second reports copying only `.model` from a child update or helper Return, which can discard Commands or an OutMessage. Both require local evidence of the child boundary and leave fold `write` callbacks and silent reflection helpers alone.

`no-child-message-construction-in-root` now follows local `const` aliases of imported child Message constructors and namespaces, so storing a constructor before calling it does not bypass the rule.

Projects extending the recommended preset may need to replace direct child Model writes and manual child Return copies with child-owned helpers folded through `Update.foldChild` or `Update.foldChildStep`. A parent that calls an aliased child Message constructor must move that fact into the child helper as well. Disable either new rule in the project's oxlint config temporarily if that migration cannot happen in the same change.
