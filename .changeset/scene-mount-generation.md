---
'foldkit': patch
---

Reacquire a marked Scene Mount after its keyed child is removed and recreated before the next render. Track the physical element separately from the retired occurrence so restoring a marker also starts the replacement acquisition. Acknowledge the old acquisition with `Scene.Mount.expectEnded`, then resolve the replacement Mount.
