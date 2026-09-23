---
'foldkit': minor
'create-foldkit-app': patch
---

Add `Query.define` as a remote-data Submodel. One Query owns one `AsyncData` field. A KeyedQuery owns a `HashMap` of `{ args, data }` slots. Fetch is a Command. `loadIfMissing`, `revalidate`, and `revalidateOrLoad` start that Command from the Model. A fetched result stays for the life of the owning Model. `query.lift` folds child Messages into the parent with `toParentMessage` and `Update.Fold`.

Scaffold `api-cache-query` as the full app for this module.
