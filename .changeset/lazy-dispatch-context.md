---
'foldkit': patch
---

Fix lazy memoization to invalidate when dispatch context changes. Previously, lazy and keyedLazy could return stale cached VNodes when the dispatch context differed between calls, causing event handlers to reference an outdated dispatch function.
