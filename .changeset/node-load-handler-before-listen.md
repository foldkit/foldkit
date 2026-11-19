---
'@foldkit/node': patch
---

`serve` now loads the built Fetch handler before it opens the port. Previously the server started listening first and then read `foldkit.build.json` and imported the handler, so a request that arrived during that window was accepted and never answered. The client waited until its own timeout, and a readiness probe that only checked for an open port could send traffic to a server that could not respond yet.

Now the port accepts connections only once the handler is in place, so a request that connects is answered. A startup failure, such as a missing build or an invalid manifest, ends `serve` before the port is opened. The `serve` options and the static file and Fetch handler behavior are unchanged.
