---
'foldkit': minor
---

Allow experimental Query and KeyedQuery definitions to omit `execute` and provide their fetch implementations through `query.toLayer`. Fetch Commands from these definitions carry a handler requirement through Query loading operations. `query.run` uses the same handler Layer. Definitions with inline `execute` remain supported.
