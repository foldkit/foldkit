---
'@foldkit/oxlint-plugin': patch
---

Recognize `makeMapBinding` from `foldkit/mapBinding` when checking child Model ownership, parent Message construction, generated routing, and Binding writers. Named aliases and namespace imports retain the parent/child relationship; unrelated and shadowed functions are excluded. Detect direct child Model transformations through Effect `HashMap.modify` in either call form.
