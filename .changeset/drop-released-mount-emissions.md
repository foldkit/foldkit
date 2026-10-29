---
'foldkit': patch
---

Discard Messages emitted by a Mount after its element is removed while cleanup runs. These emissions could reach update at the root or log a missing-wrap failure after a Submodel boundary was removed.

Thanks to @boozedog for reporting the issue and suggesting the lifecycle guard.
