---
'@foldkit/ui': patch
---

Remove the dead try/catch and stale comment around Anchor portal cleanup. There is no behavior change: removing an already-detached element is a no-op.
