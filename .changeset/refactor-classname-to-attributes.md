---
'foldkit': major
---

Add `attributes` escape hatch to component-rendered UI components alongside existing `className` props.

Every element slot on component-rendered components (Tabs, Disclosure, Dialog, Popover, Menu, Listbox, Combobox, RadioGroup) now accepts an optional `*Attributes: ReadonlyArray<Attribute<Message>>` alongside the existing `*ClassName: string`. The component spreads `className` first, then `attributes`, so consumers can pass `Class(...)`, `DataAttribute(...)`, `Style({...})`, or any other attribute through the escape hatch.

**Breaking changes:**

- **Tabs**: `tabListAriaLabel` is now required (was optional).
- **RadioGroup**: `ariaLabel` is now required (new prop — enforces accessible name on the `radiogroup` role).
- **Foldkit vdom**: `keyed()` now accepts `ReadonlyArray<Attribute<Message>>` instead of `ReadonlyArray<AttributeWithoutKey<Message>>`.
