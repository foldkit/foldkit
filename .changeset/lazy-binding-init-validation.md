---
foldkit: patch
---

Defer child Model validation and equivalence derivation until a Binding's init recipe runs. Making direct or keyed Bindings no longer derives checks for children that have not been initialized. Initialization retains Schema validation, custom equivalence, occurrence and registration checks.
