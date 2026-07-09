---
'@foldkit/ui': minor
---

Evict the active-tab value from `Tabs`. `Tabs` stays a Submodel (it keeps genuine private interaction state, the keyboard-focus cursor), but it no longer stores the selected tab in its Model. The parent owns the active tab and passes it in each render.

- `Tabs.Model` drops `activeIndex`. It is now `{ id, maybeFocusedIndex, activationMode }`, where `maybeFocusedIndex` is the roving-tabindex cursor (`None` means focus follows the selected tab; `Manual` activation stores `Some(index)` while focus diverges).
- `Tabs.ViewInputs` gains a required `selectedValue: Value`. `aria-selected`, the `data-selected` marker, `TabInfo.isActive`, and `RenderInfo.activeIndex` all derive from it.
- `Tabs.init` no longer accepts `activeIndex`. The parent initializes its own active-tab field.
- The `Selected({ value, index })` OutMessage is unchanged and still fires on click or keyboard commit. The parent folds it into its active-tab field.

BREAKING: `reflectSelectedTab` and `selectTab` are removed (both existed to sync the value the parent now owns outright). Move the active tab to a parent Model field: store it, pass it as `selectedValue`, fold `Selected` into it in `update`, and set it directly for programmatic selection instead of calling `selectTab` / `reflectSelectedTab`. Part of #676.
