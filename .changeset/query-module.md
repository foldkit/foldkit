---
'foldkit': minor
'create-foldkit-app': patch
---

Add experimental `Query.define` as a remote-data Submodel, available from `foldkit/experimental` and `foldkit/experimental/query`. A Query Model wraps one `AsyncData` value, and a KeyedQuery Model wraps a `HashMap` of `{ args, data }` slots. Both expose their data through `read`. Fetch is a Command. `loadIfMissing`, `revalidate`, and `revalidateOrLoad` apply loading policies directly to the Model and return that Command when needed. A fetched result stays for the life of the owning Model. `query.lift` folds child Messages into the parent with `toParentMessage` and `Update.Fold`.

Scaffold `api-cache-query` as the full app for this module.
