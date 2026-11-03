---
'foldkit': patch
---

Preserve constructor ownership and cleanup across Layer provisioning. Reject stale or unrelated child connections, and snapshot Definition declarations before validation and native construction so later mutations or accessors cannot change the checked contract.

Interrupt pending Commands when their child occurrence is removed, skip retired deferred work, and preserve currentness checks through buffered renderer dispatch. Pure cancellation remains quiet while Command and cleanup defects still report.

Make embed disposal wait for predecessor teardown across interrupted re-embeds, and prevent a disposed successor from starting after that teardown finishes.
