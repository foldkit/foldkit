---
'foldkit': minor
---

Construct experimental Query and KeyedQuery fetch implementations through the final `Query.define` Effect argument and expose the attached recipe as `query.layer`. Fetch Commands from these definitions carry a handler requirement through Query loading operations, and `query.run` uses the same handler Layer. Omit the final argument when an external host supplies the fetch implementation; that definition has no `.layer`. `query.toLayer` constructs a host implementation or an alternative to the canonical handler.
