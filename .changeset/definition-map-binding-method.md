---
'foldkit': minor
'@foldkit/oxlint-plugin': minor
'create-foldkit-app': patch
---

Create Record and HashMap child Bindings with the owning Definition's `makeMapBinding` method, consistently with `makeBinding`. The method can also be destructured and exported from a feature's `definition.ts` without losing parent ownership or contextual typing.

Replace `makeMapBinding(ParentDefinition, ChildBlock, config)` from `foldkit/mapBinding` with `ParentDefinition.makeMapBinding(ChildBlock, config)`, then remove the standalone import. The `foldkit/mapBinding` entry point is removed. Advanced public type references use `Block.MakeMapBinding` from `foldkit/block`; ordinary consumers need no additional annotations.

Update lint ownership recognition, active guides, scaffolds and skills for both qualified and extracted Definition methods. Storage, key validation, parent-owned membership, initialization and lifecycle contracts are unchanged.
