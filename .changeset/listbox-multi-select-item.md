---
'foldkit': minor
---

Add `Ui.Listbox.Multi.selectItem` helper, mirroring `Ui.Listbox.selectItem` for single-select. Use this in domain-event handlers when a multi-select listbox uses `onSelectedItem` to intercept selection — it returns the next listbox state with the item toggled in or out of the selection.
