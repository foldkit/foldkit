---
'foldkit': minor
---

Add `toParentMessage` to `foldkit/test` for parent Stories that need a child fact without rendering a view. Pass the actual Binding and decoded child Message; a keyed Binding takes its decoded key before the Message. The helper retains generated delivery identity and uses synthetic generation `0` for pure replay. It cannot select a live occurrence or override Runtime admission.

`Story.message` now accepts concurrent Messages while earlier Commands remain pending. It preserves those Commands and appends new ones without running stored resolvers. Resolve each Command explicitly before the Story ends; unresolved work and ambiguous matches still fail. Scene retains its existing pending-Command and Mount checks.

Document the precise operation-derived Model input for an extracted local transition followed by an emitting connected operation. Use `Parameters<typeof operation>[0]` when extraction needs that explicit registered input contract.
