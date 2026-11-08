---
'foldkit': patch
---

Preserve the Model explicitly supplied to `Update.combineSteps` when a child operation defers execution. Both data-first and applied data-last combinations now retain preceding Model changes, including nested combinations, while preserving child updates and Command dispatch order.
