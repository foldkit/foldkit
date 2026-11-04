---
'foldkit': patch
---

Reduce TypeScript declaration-loading cost for Runtime imports by exporting the public symbols directly from their owning modules. The public API and runtime export identities are unchanged.
