---
'@foldkit/node': patch
---

Cancel unused response bodies when a Fetch handler resolves after the client disconnects, including responses awaiting handoff to the Node stream. Keep handler waits interruptible so shutdown does not wait for handlers that ignore abort.
