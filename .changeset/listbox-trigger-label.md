---
'foldkit': minor
'@foldkit/ui': minor
---

Add a first-class way to associate an external label with the `Ui.Listbox`
trigger button.

`ViewInputs` now accepts optional `ariaLabel` and `ariaLabelledBy`. When
provided, they are applied to the trigger button, with `ariaLabel` taking
precedence. Neither attribute is rendered when omitted, so the trigger never
carries a dangling `aria-labelledby`. `Listbox.buttonId(id)` (and
`Listbox.Multi.buttonId(id)`) returns the bare id of the trigger button,
mirroring the existing `buttonSelector`, so a native
`<label for={Listbox.buttonId(id)}>` can drive click-to-focus without
hardcoding the internal `-button` convention.
