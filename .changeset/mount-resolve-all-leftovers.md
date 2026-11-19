---
'foldkit': minor
---

`Scene.Mount.resolveAll` now skips an entry that matches no pending Mount instead of throwing. Before, a shared resolver list failed for any scene that did not render every listed Mount. Say a view renders `FocusButton` always and `MeasurePanel` only while a panel is open. One list for both Mounts passed the open scene and threw `I tried to resolve Mount MeasurePanel but it wasn't in the pending Mounts.` for the closed one. The same happened with more entries for a Definition than rendered occurrences, and with an Instance entry whose args matched nothing.

Entries still resolve in declaration order, one pending Mount each. A skipped entry is dropped when the step ends. It does not carry forward to a Mount rendered by a later step, unlike `Scene.Command.resolveAll` resolvers.

The new `Scene.Mount.resolveAllExact` keeps the strict check in one step. It throws if any entry matches no pending Mount, and it throws if a pending Mount is left unresolved, the same as `Scene.Command.resolveAllExact`.

A Mount that is rendered but never resolved still fails the scene, at the next interaction or at the end.

This is a breaking change for test suites that used `Mount.resolveAll` to check which Mounts were rendered: those tests keep passing but stop checking it. Switch them to `Mount.resolveAllExact` to keep that check:

```ts
Scene.Mount.resolveAllExact(
  [Listbox.AnchorListbox, Listbox.Message.CompletedAnchorListbox()],
  [
    Listbox.PortalListboxBackdrop,
    Listbox.Message.CompletedPortalListboxBackdrop(),
  ],
)
```
