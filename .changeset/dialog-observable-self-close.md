---
'@foldkit/ui': patch
---

Emit Dialog's `Closed` OutMessage whenever an open Model becomes closed, including failed native show, failed lifecycle resource acquisition, and unmount. Parents can use one close policy for these paths instead of polling the Dialog Model. Already-closed and leaving Models do not emit duplicate notifications. Resource release and the separate `CompletedClose` notification keep their existing behavior.
