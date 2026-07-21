---
'foldkit': minor
---

`Machine` in `foldkit/experimental/machine` now threads a requirements type parameter `R` through `define`, `to`, `when`, and the transition result types, so an edge Command whose Effect needs a service (an RPC client or anything Layer-provided) typechecks instead of being rejected against a `never` requirements channel. `R` defaults to `never` and is inferred from the table when every edge Command shares one service. When edges need distinct services, supply the union on the second call: `define(schemas)<UploadsClient | SaveClient>({ ... })`.
