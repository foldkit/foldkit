---
'foldkit': patch
---

Fix DevTools model tree expansion and diff highlighting bugs. Add Snabbdom keys to tree nodes so the virtual DOM correctly reuses elements when expanding/collapsing, and replace reference-identity array diffing with positional comparison that recurses into items to find specific changed fields.
