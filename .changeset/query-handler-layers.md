---
'foldkit': minor
---

Require experimental Query and KeyedQuery fetch implementations to be supplied through `query.toLayer(Effect<handler>)`. Fetch Commands from these definitions carry a handler requirement through Query loading operations, and `query.run` uses the same handler Layer.
