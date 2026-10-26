---
'foldkit': minor
'create-foldkit-app': patch
---

Add `initAndAppend` from `foldkit/bindingInit` for dynamic creation in keyed child arrays that already declare `init.instances` and `init.toItem`. Pass the Binding, current parent Model, and `{ key, args }`; Foldkit reuses the stored wrapper constructor and appends the child when Composition interprets the passive recipe. Existing keys are rejected, and the recipe retains the child's exact init arguments, lifted Commands, and required Binding registration.
