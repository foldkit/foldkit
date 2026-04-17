---
'foldkit': minor
---

Add programmatic `open` and `close` helper functions to all UI components
with open/close semantics. Each returns `[Model, Commands]` directly,
mirroring the existing `Dialog.close` pattern.

- Dialog: add `open`
- Disclosure: add `close`
- Menu: add `open`, `close`
- Combobox: add `open`, `close` (single and multi)
- Listbox: add `open`, `close` (single and multi)
