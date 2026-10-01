---
'@foldkit/oxlint-plugin': patch
---

`foldkit/got-prefix-requires-submodel-payload` recognizes the `.Message` member of a local `Query.define` binding as a Got\* child payload. Arbitrary local objects with a property named `Message` remain invalid, while imported child Messages continue to work.
