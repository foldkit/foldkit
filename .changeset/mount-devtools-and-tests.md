---
'foldkit': minor
'@foldkit/devtools-mcp': minor
---

Mount lifecycle is now surfaced in DevTools and Scene tests, and the Scene + Story test APIs are reorganised into per-kind namespaces.

**Tests.** `Scene` tracks pending mounts walked from the rendered VNode tree and requires explicit acknowledgement before the scene finishes, mirroring how Commands are resolved. The Command and Mount steps are now grouped into `Scene.Command` and `Scene.Mount` namespaces (and `Story.Command` for Story tests):

```ts
// Commands (was Scene.resolve / Story.resolve)
Scene.Command.resolve(definition, resultMessage)
Scene.Command.resolveAll(...resolvers)
Scene.Command.expectHas(...definitions)
Scene.Command.expectExact(...definitions)
Scene.Command.expectNone()

// Mounts (new)
Scene.Mount.resolve(definition, resultMessage)
Scene.Mount.resolveAll(...resolvers)
Scene.Mount.expectHas(...definitions)
Scene.Mount.expectExact(...definitions)
Scene.Mount.expectNone()
```

The previous flat API (`Scene.resolve`, `Scene.resolveAll`, `Scene.expectHasCommands`, `Scene.expectExactCommands`, `Scene.expectNoCommands`, and the parallel `Story.*` set) is removed. Test code that destructures may write `const { Command, Mount } = Scene` for shorter call sites.

Mount tracking semantics: pending mounts persist across re-renders so resolving does not re-pend them. A mount that disappears from the tree is silently dropped to mirror real unmount semantics. Same-named mounts coexisting in the tree are disambiguated by an occurrence index, so two open instances of the same component don't collide.

**DevTools.** A new `MountTracker` Context.Service is provided during render so the snabbdom `OnMount` insert/destroy hooks emit lifecycle events to the runtime synchronously. The runtime drains the buffer after each render and attaches the names to the history entry that caused the render. The DevTools overlay grows a new **Mounts** inspector tab listing the Mounts that fired and unmounted for the selected entry. Init-time mount activity attaches to the synthetic init entry.

**Protocol** (breaking for any external DevTools wire-format consumer): `SerializedEntry` gains `mountStartNames` and `mountEndNames`; `ResponseInit` gains `mountStartNames`. The in-tree `@foldkit/devtools-mcp` is updated.

**Component Mount exports.** UI components now export their Mount definitions so consumer Scene tests can acknowledge them: `PopoverAnchor`, `TooltipAnchor`, `MenuAnchor`, `MenuFocusItemsOnMount`, `ListboxAnchor`, `ListboxFocusItemsOnMount`, `ComboboxAnchor`, `ComboboxAttachPreventBlur`, `ComboboxAttachSelectOnFocus`. Existing Scene tests that render any of these components now need a corresponding `Scene.Mount.resolve` step.
