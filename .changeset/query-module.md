---
'foldkit': minor
'create-foldkit-app': patch
'@foldkit/vite-plugin': patch
---

Add `Query.define` as a remote-data Submodel. One Query owns one `AsyncData` field. A KeyedQuery owns a `HashMap` of `{ args, data }` slots. Fetch is an interruptible Command. `informWatch` and `informForget` start and stop work from the Model. `query.lift` folds child Messages into the parent. `Query.HttpApi.Service.query` builds the same Submodel from an Effect HttpApi endpoint.

Scaffold `api-cache-query` and `api-cache-http-api` as the full apps for this module.

Prebundle `effect/Latch` in `@foldkit/vite-plugin` so that import is present in the optimizer blob.
