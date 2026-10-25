---
'foldkit': minor
'create-foldkit-app': patch
---

Export `FieldTransforms<Model>` from `foldkit/struct` for helpers accepting typed per-field updates. Share the same field-preserving contract between `modifyFields`, `makeModifyFieldsFor`, and Definition-owned field Steps.

An empty record returned by `Definition.makeFieldsStep` now preserves the identical incoming Model. Its callback still runs only when the Step is applied, and nonempty records retain existing field transformation behavior, including symbol fields. Conditional empty updates can now be no-ops without changing Model identity.
