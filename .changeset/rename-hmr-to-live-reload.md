---
'foldkit': minor
---

Rename the `foldkit/hmr-protocol` export to `foldkit/model-preservation` and correct dev-reload terminology.

Foldkit's dev-time state preservation serializes the Model, triggers a full page reload, and restores the Model on the fresh boot. That is live reload, not hot module replacement, so the naming now matches the mechanism. The public subpath `foldkit/hmr-protocol` is now `foldkit/model-preservation`, and the `PreserveModelMessage` `isHmrReload` field is now `isReloadFlush`. If you import `foldkit/hmr-protocol` directly, update the specifier to `foldkit/model-preservation`.
