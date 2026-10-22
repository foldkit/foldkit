---
'foldkit': patch
---

Reduce type instantiation when Block assembly checks handler contracts for conflicts. Handlers that share a finite Context key are now compared once per key group instead of once per handler entry. Open key spaces, such as `string` or template literal handler names, keep the previous per-entry comparison, so a literal handler hidden beneath a broad name still reports the same conflict. Conflict diagnostics and accepted handler sets are unchanged.
