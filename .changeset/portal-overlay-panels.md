---
'foldkit': minor
---

`Ui.Listbox`, `Ui.Menu`, and `Ui.Combobox` now always portal their items panel to the document body, positioned relative to the trigger with Floating UI. Previously this only happened when an `anchor` config was supplied; without one the panel rendered inline, at the mercy of the parent stacking context. Any sibling with an explicit z-index (a sticky section header, a toast, another overlay's wrapper) could occlude the open panel, forcing consumers into an app-wide z-index ladder.

`anchor` remains optional and defaults to `bottom-start` placement with no gap.

### Migration

- If you already pass `anchor`, nothing changes.
- If you rendered without `anchor` and positioned the panel with your own CSS (for example `absolute top-full mt-1`), remove those rules. Floating UI now writes `left` and `top` inline. Express spacing through `anchor: { gap }` and `placement` instead, and size the panel with `width: var(--button-width)` (Tailwind `w-(--button-width)`) rather than `w-full`. Give the panel a z-index above your elevated content; the docs demos use `z-10`.
- To keep the panel inside the wrapper, pass `anchor: { portal: false }`. The panel is still positioned by Floating UI.
- Scene tests that open one of these components now have a pending anchor Mount to acknowledge: add `Scene.Mount.resolve(AnchorListbox, CompletedAnchorListbox())`, `Scene.Mount.resolve(AnchorMenu, CompletedAnchorMenu())`, or `Scene.Mount.resolve(AnchorCombobox, CompletedAnchorCombobox())`.
- Combobox only: the items panel no longer renders the `AttachComboboxPreventBlur` Mount, because `AnchorCombobox` installs the blur-prevention listener itself. Scene tests that resolved `AttachComboboxPreventBlur` on the items panel should resolve `AnchorCombobox` instead. The Mount still renders on the toggle button.
