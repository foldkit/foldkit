---
'foldkit': patch
---

Use per-render traversal bookkeeping for Mount registration validation without updating a persistent WeakMap for every visited container. Validation still inspects reused lazy VNodes and rejects unregistered Mounts before patching.
