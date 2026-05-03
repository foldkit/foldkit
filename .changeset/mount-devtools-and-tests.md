---
'foldkit': minor
'@foldkit/devtools-mcp': minor
---

Mount lifecycle is now surfaced in DevTools and Scene tests.

Tests: Scene tests track pending mounts walked from the rendered VNode tree and require explicit acknowledgement before the scene finishes, mirroring how Commands are resolved. New steps:

- `Scene.resolveMount(definition, resultMessage)`
- `Scene.resolveMount(definition, resultMessage, toParentMessage)` (Submodel form)
- `Scene.resolveAllMounts(...resolvers)`
- `Scene.expectHasMounts(...definitions)`
- `Scene.expectExactMounts(...definitions)`
- `Scene.expectNoMounts()`

Pending mounts persist across re-renders so resolving does not re-pend them. A mount that disappears from the tree is silently dropped to mirror real unmount semantics. Same-named mounts coexisting in the tree are disambiguated by an occurrence index, so two open instances of the same component don't collide.

DevTools: a new `MountTracker` Context.Service is provided during render so the snabbdom `OnMount` insert/destroy hooks emit lifecycle events to the runtime synchronously. The runtime drains the buffer after each render and attaches the names to the history entry that caused the render. The DevTools overlay grows a new **Mounts** inspector tab listing the Mounts that fired and unmounted for the selected entry. Init-time mount activity attaches to the synthetic init entry.

Protocol (breaking for any external DevTools wire-format consumer): `SerializedEntry` gains `mountStartNames` and `mountEndNames`; `ResponseInit` gains `mountStartNames`. The in-tree `@foldkit/devtools-mcp` is updated.

UI components now export their Mount definitions so consumer Scene tests can acknowledge them: `PopoverAnchor`, `TooltipAnchor`, `MenuAnchor`, `MenuFocusItemsOnMount`, `ListboxAnchor`, `ListboxFocusItemsOnMount`, `ComboboxAnchor`, `ComboboxAttachPreventBlur`, `ComboboxAttachSelectOnFocus`. Existing Scene tests that render any of these components now need a corresponding `Scene.resolveMount` step.
