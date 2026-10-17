---
'foldkit': patch
---

Reduce server rendering CPU work by sharing parsed HTML trees across checks that use the same insertion context and scripting mode. Template injection captures the rendered HTML once so validation and insertion use the same markup. All markup safety and hydration checks run in both development and production.
