---
'foldkit': patch
---

Internal refactor: bind `html<ParentMessage>()` helpers as a namespaced `h` object across UI components, devtools, and tests instead of destructuring individual element/attribute helpers. No public API change.
