---
'foldkit': patch
---

Make `EmbedHandle.dispose()` return an idempotent Promise that settles after runtime teardown and container restoration. Hosts can await disposal before reusing the container for a different Program.
