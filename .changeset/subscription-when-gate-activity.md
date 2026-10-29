---
'foldkit': minor
'@foldkit/ui': patch
---

Subscription entries accept an optional `when` predicate on the owning Model. A closed gate interrupts the Stream and skips dependency projection. Own gates compose with parent Binding gates and child presence, including nested lifts and keep-alive Streams. Handler Layers still build at Runtime startup and retain their constructor errors and Service requirements.

Scene adds `Subscription.expectActive(entry)` and `Subscription.expectInactive(entry)` to inspect these gates against the current Model. `Subscription.emit` continues to allow a queued event after its source becomes inactive.

DragAndDrop auto-scroll uses the entry gate for its lifetime while its running Stream reads the latest pointer position without restarting on pointer movement.
