---
'foldkit': minor
---

Add `Scene.Mount.expectEnded` for declaring that a Mount disappeared from the rendered tree. Every Mount that fires and then unmounts during a scene must be acknowledged with `expectEnded`, regardless of whether it was previously resolved. The scene throws at the end of the test for any unacknowledged unmount.

```ts
Scene.scene(
  { update, view },
  Scene.with(closedModel),
  Scene.click(Scene.role('button', { name: 'Open' })),
  Scene.Mount.resolve(AnchorPopover, CompletedAnchorPopover()),
  Scene.Mount.resolve(PortalPopoverBackdrop, CompletedPortalPopoverBackdrop()),
  Scene.click(Scene.role('button', { name: 'Done' })),
  Scene.Mount.expectEnded(AnchorPopover, PortalPopoverBackdrop),
)
```

Mount lifecycle now surfaces as deliberate test steps so the test reads as a precise account of what happened during the simulation. `resolve` handles a Mount's result Message; `expectEnded` handles its unmount. The two are independent test steps.

The throw fires at two points: at the end of the scene for any unacknowledged unmount, and at the next interaction that dispatches a Message (so the error points to the offending step rather than waiting for scene end).

Existing tests that previously relied on the silent-drop behavior for unmounted Mounts will now throw and need an `expectEnded` step for each Mount that fired and disappeared during the scene.
