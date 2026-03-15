---
'foldkit': major
---

Add `attributes` escape hatch to component-rendered UI components alongside existing `className` props.

Every element slot on component-rendered components (Tabs, Disclosure, Dialog, Popover, Menu, Listbox, Combobox, RadioGroup) now accepts an optional `*Attributes: ReadonlyArray<Attribute<Message>>` alongside the existing `*ClassName: string`. The component spreads `className` first, then `attributes`, so consumers can pass `Class(...)`, `DataAttribute(...)`, `Style({...})`, or any other attribute through the escape hatch.

Replace `NoOp` with descriptive `Completed*` messages across all UI components. Every message now carries meaning about what happened. Fire-and-forget commands use object+verb compound nouns (`CompletedScrollLock`, `CompletedDialogShow`). View-dispatched no-ops use descriptive facts (`IgnoredMouseClick`, `SuppressedSpaceScroll`). Consumers matching on `NoOp` must update to the component-specific `Completed*` variants.

Export `createLazy` and `createKeyedLazy` from `foldkit/html` — previously these were internal-only, now available for consumers building custom lazy-evaluated views.

Add lazy memoization to DevTools tree nodes and message rows for improved rendering performance.

**Breaking changes:**

- **All UI components**: `NoOp` message removed. Replace with the component-specific `Completed*`, `Ignored*`, or `Suppressed*` messages (see each component's public exports).
- **Tabs**: `tabListAriaLabel` is now required (was optional).
- **RadioGroup**: `ariaLabel` is now required (new prop — enforces accessible name on the `radiogroup` role).
- **Foldkit vdom**: `keyed()` now accepts `ReadonlyArray<Attribute<Message>>` instead of `ReadonlyArray<AttributeWithoutKey<Message>>`.
