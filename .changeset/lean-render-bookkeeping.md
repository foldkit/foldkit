---
'foldkit': patch
---

Reduce allocation during Mount-registration validation and repeated occurrence-guarded dispatcher lookup. Mounts are still validated before DOM updates on every render, including cached views, and lazy restoration and stale-instance guards remain intact. The optimized Todo workload improves while public APIs remain unchanged.
