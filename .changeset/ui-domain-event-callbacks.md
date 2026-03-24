---
'foldkit': minor
---

Add optional domain-event callbacks to all UI components, separating user-meaningful events from internal plumbing in `toParentMessage`. Backwards compatible — when omitted, existing behavior is unchanged.

**RadioGroup:** `onSelected(value, index)` with narrowed generic type, `select()` helper, `SelectedOption` value export
**Tabs:** `onTabSelected(index)`, `selectTab()` helper
**Dialog:** `onClosed()`, `close()` helper
**Menu:** `onSelectedItem(index)`, `selectItem()` helper
**Listbox:** `onSelectedItem(value)` (single + multi), `selectItem()` helper
**Popover:** `onOpened()`, `onClosed()`, `open()` and `close()` helpers
**Disclosure:** `onToggled()`, `toggle()` helper
**Combobox:** `onSelectedItem(value)` (single + multi), `SelectedItem` value export

Previously type-only message constructors (`SelectedOption`, `TabSelected`, `SelectedItem`, `Opened`, `Closed`, `Toggled`) are now exported as values for programmatic use with `update()` and helper functions.
