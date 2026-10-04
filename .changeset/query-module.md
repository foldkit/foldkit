---
'foldkit': minor
'create-foldkit-app': minor
---

Add experimental `Query` and `KeyedQuery` Submodels for fetched data that belongs in an application Model. Define the data and error Schemas together with the Effect that fetches the value, then embed the generated Model and Message in the parent. A Query holds one `AsyncData` value. A KeyedQuery holds one retained entry for each argument key, so revisiting data already loaded into the owning Model is a cache hit.

The parent still decides when work starts. `loadIfMissing` fetches only when no data is available, `revalidate` refreshes existing data, and `revalidateOrLoad` handles either state. Query tracks request generations, and `reset` preserves that history, so a late completion cannot settle work started after the reset. KeyedQuery's default key encoding canonicalizes object property order recursively. `read` returns the current `AsyncData`, `run` fetches data outside a Foldkit application, and `lift({ parentField, toParentMessage })` connects the Query to its parent.

Import Query from `foldkit/experimental` or `foldkit/experimental/query`. Create Foldkit App also includes `api-cache-query`, a complete example of list, detail, and interval-refreshed Queries.
