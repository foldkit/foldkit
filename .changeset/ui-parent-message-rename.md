---
'foldkit': patch
---

Internal: renames the generic type parameter on UI component `ViewConfig` and `view`/`lazy` helpers from `Message` to `ParentMessage`. The new name reflects that consumers pass their own parent message type into the component. No behavior or call-site changes. Generic parameter names are not part of the type contract, so existing `Ui.X.view<MyMessage>(...)` calls continue to work unchanged.
