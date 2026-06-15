---
'foldkit': patch
---

Reword the slow view warning to lead with `createLazy` memoization. Caching derived data on the model in `update` is now framed as the fallback for when memoization cannot cover the cost, rather than the first suggestion.
