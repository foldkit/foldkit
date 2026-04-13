---
'foldkit': minor
---

Add `Ui.Combobox.selectItem` and `Ui.Combobox.Multi.selectItem` helpers, mirroring the equivalents on `Ui.Listbox`. Use these in domain-event handlers when a combobox uses `onSelectedItem` to intercept selection. Single-select takes `(model, item, displayText)` because Combobox tracks the selected item and its display text separately. Multi-select takes `(model, item)` since it only tracks the toggled items.
