---
'foldkit': minor
---

Add `foldkit/update`, the update-layer companion to `foldkit/asyncData`:
the `Return`, `ReturnWithOutMessage`, `Commands`, and `Step` types every
update function is built from, the `combine` step composer that threads
the Model through a list of steps and batches their Commands, the
do-nothing `noOp` step, and `refresh`, which turns a `Refreshable`
record (read, revalidate, write, load) into a step that revalidates one
cache and emits its reload Command.

Also add `Route.RouteTransition` and `Route.isTransitionTo` for
route-entry loading policies shared between init and navigation, and
`AsyncData.getOrIdle` for collapsing a missing keyed-cache entry to
`Idle`.
