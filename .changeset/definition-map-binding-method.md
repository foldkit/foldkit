---
'foldkit': minor
'@foldkit/oxlint-plugin': minor
'create-foldkit-app': patch
---

Create Record and HashMap child Bindings through the owning Block's `makeRecordBinding` and `makeHashMapBinding` methods. These constructors retain exact parent ownership and contextual typing when destructured and imported from the feature's `block.ts`.

Replace standalone `makeMapBinding(ParentBlock, ChildBlock, config)` from `foldkit/mapBinding` with the appropriate parent method, then remove the standalone import. The `foldkit/mapBinding` entry point is removed. Advanced native type references use `Block.MakeMapBinding` from `foldkit/block`; ordinary consumers need no additional annotations.
