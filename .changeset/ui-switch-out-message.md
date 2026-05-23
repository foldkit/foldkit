---
'foldkit': minor
---

`Ui.Switch.update` now returns `[Model, Commands, Option<OutMessage>]` (was `[Model, Commands]`). Adds a new `ToggledChecked({ isChecked: boolean })` OutMessage variant, emitted on every toggle. Same shape as `Ui.Checkbox.ToggledChecked` — closes the same gap where consumers shortcut around the Submodel wrapper to dispatch a domain Message directly.

Existing 2-tuple destructures keep compiling.
