---
'foldkit': minor
'@foldkit/ui': minor
'@foldkit/devtools': minor
'@foldkit/oxlint-plugin': minor
'create-foldkit-app': patch
---

Rename `evo` to `modifyFields`

Replace `evo` imports and calls with `modifyFields` from `foldkit/struct`. Replace `makeConstrainedEvo` with `makeModifyFieldsFor`. The same names are available through the `Struct` namespace from `foldkit`. Both helpers keep their existing behavior and type checking. The old names are removed.

Use `makeModifyFieldsFor<Base>()` to create a field modifier for generic helpers whose Model extends `Base`. It checks transformers against the base shape while preserving the full Model type.

`@foldkit/ui` and `@foldkit/devtools` use the renamed helpers and require Foldkit 0.163.0 or newer.

Rename the lint rule `foldkit/no-spread-in-evo` to `foldkit/no-spread-in-modify-fields`. Update explicit rule settings to the new name. The generated presets and the Submodel boundary rules recognize `modifyFields` calls.

New app templates, documentation, examples, and the shipped Foldkit app skills use `modifyFields`.
