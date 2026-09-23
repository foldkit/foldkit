---
'@foldkit/oxlint-plugin': patch
---

`foldkit/got-prefix-requires-submodel-payload` accepts a local `.Message` member as a Got\* child payload. `postsQuery.Message` from a Query defined in the same file is a child Message, as is an imported `Child.Message`.
