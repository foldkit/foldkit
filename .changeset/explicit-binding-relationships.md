---
'foldkit': minor
'@foldkit/ui': patch
'@foldkit/devtools': patch
'@foldkit/markdown': patch
'@foldkit/oxlint-plugin': patch
'create-foldkit-app': patch
---

Make child storage explicit through the parent Block's `makeRequiredFieldBinding`, `makeOptionalFieldBinding`, `makeOptionalKeyedFieldBinding`, `makeKeyedArrayBinding`, `makeRecordBinding`, `makeHashMapBinding`, `makeCustomBinding`, `makeCustomKeyedBinding` and `makeVariantBinding` constructors. Exact field, key, wrapper, init, Service and registration contracts are preserved. Constructor selection describes storage; an Option-valued child Model inside one required field is a required relationship.

Replace each `makeBinding` or `makeMapBinding` call with the constructor matching its existing parent Model storage. Move standalone `makeVariantBinding(parent, child, config)` calls to `parent.makeVariantBinding(child, config)`. Rename direct-field `presentWhen` to `activeWhen`; false deactivates the whole occurrence while retaining its stored Model. Delivery admission and Subscription-only gates keep their separate roles.

Move initialization-helper imports from `foldkit/bindingInit` to `foldkit/binding`. Helper names and behavior are unchanged. The implicit constructors and old helper/variant subpaths have no compatibility aliases.

Migrate UI composition, DevTools, examples, scaffolds and active documentation to the explicit relationships. Ownership lint checks recognize the complete constructor family through qualified, destructured, aliased and imported helpers, while excluding unrelated or shadowed functions.
