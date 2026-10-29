---
'@foldkit/oxlint-plugin': patch
---

Recognize `Definition.makeMapBinding` when checking child Model ownership, parent Message construction, generated routing, and Binding writers. Qualified calls and extracted or imported feature helpers retain the parent/child relationship; unrelated and shadowed functions are excluded. Detect direct child Model transformations through Effect `HashMap.modify` in either call form.
