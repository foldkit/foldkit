---
'foldkit': minor
---

Rename misleading Messages in `Ui.Combobox`, `Ui.Listbox`, `Ui.Menu`, and `Ui.Popover` so each name describes what its dispatch site actually observes. All four components emitted `ClosedByTab` from an `OnBlur` handler, which fires for any blur cause (Tab key, outside click, programmatic blur, focus shift). The "ByTab" suffix invented a trigger the handler cannot verify.

**Breaking.**

- `Combobox.ClosedByTab` → `Combobox.BlurredInput`
- `Listbox.ClosedByTab` → `Listbox.BlurredItems`
- `Menu.ClosedByTab` → `Menu.BlurredItems`
- `Popover.ClosedByTab` → `Popover.BlurredPanel`

Update any code that constructed or pattern-matched on the old names. Behavior is unchanged.
