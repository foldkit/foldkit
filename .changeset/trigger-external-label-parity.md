---
'foldkit': minor
'@foldkit/ui': minor
---

Bring external-label support to the remaining trigger-based `@foldkit/ui`
components, matching the `Ui.Listbox` trigger.

`Ui.Combobox`, `Ui.Menu`, `Ui.DatePicker`, `Ui.Popover`, `Ui.Tooltip`, and
`Ui.Disclosure` now accept optional `ariaLabel` and `ariaLabelledBy` on their
view inputs. When provided, they are applied to the component's trigger
element (the input for Combobox, the button for the rest), with `ariaLabel`
taking precedence. Neither attribute is emitted when omitted, so a trigger
never carries a dangling `aria-labelledby`.

Each component also exposes a bare-id helper that mirrors its internal id
convention, so a native `<label for=...>` can target the trigger without
hardcoding the suffix: `Combobox.inputId(id)` (and `Combobox.Multi.inputId(id)`),
`Menu.buttonId(id)`, `DatePicker.triggerId(id)`, `Popover.buttonId(id)`,
`Tooltip.triggerId(id)`, and `Disclosure.buttonId(id)`.
