---
'foldkit': patch
'create-foldkit-app': patch
---

Update README and template docs to recommend binding `const h = html<Message>()` inside view functions instead of at module level. The function-level binding accepts the function's actual Message type parameter (including `<ParentMessage>` for child views), keeps view functions portable across files, and removes the need to decide where the binding lives. Behavior unchanged.
