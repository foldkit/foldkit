---
'foldkit': minor
---

Small consumer-facing changes that fall out of the Ui.\* shape migration.

### `Ui.X.lazy` removed across the board

`Ui.Checkbox.lazy`, `Ui.Switch.lazy`, `Ui.Dialog.lazy`, `Ui.Calendar.lazy`, `Ui.DatePicker.lazy`, `Ui.Disclosure.lazy`, `Ui.Popover.lazy`, and `Ui.Tooltip.lazy` are gone (along with the same removal across `Ui.Listbox`, `Ui.Combobox`, `Ui.RadioGroup`, `Ui.Tabs`, and `Ui.Menu`, covered in `ui-selection-factory.md`).

Each `Ui.X.lazy` was a no-op in practice: its cache key included a per-render-fresh `toParentMessage` closure, so the comparison missed every render. The new `h.submodel` boundary design keeps per-render closures out of the cached VNode, so a parent-side `createLazy` / `createKeyedLazy` around `h.submodel` now actually hits.

Migration: switch to plain `Ui.X.view` embedded via `h.submodel`. Wrap with `createLazy` / `createKeyedLazy` at the parent's call site if you want memoization (the wrapping is per-instance, not per-component, so it lives where the component is rendered).

```ts
// Before:
Ui.Checkbox.lazy(
  {
    // ... static config
  },
  toParentMessage,
)(model)

// After (without memoization):
h.submodel({
  id: 'agree-to-terms',
  model: model.agreeToTerms,
  view: Ui.Checkbox.view,
  viewInputs: {
    /* ... slot content if needed */
  },
  toParentMessage: message => GotCheckboxMessage({ message }),
})

// After (with memoization, parent-side):
const lazyCheckbox = createLazy()
// ... inside view:
lazyCheckbox(
  () =>
    h.submodel({
      id: 'agree-to-terms',
      model: model.agreeToTerms,
      view: Ui.Checkbox.view,
      toParentMessage: message => GotCheckboxMessage({ message }),
    }),
  [model.agreeToTerms],
)
```

### `Ui.Tooltip` exposes `RenderInfo` for slot content

Tooltip's `view` now takes a `toView` slot via `viewInputs`, consistent with the slot-based pattern used across Ui.\*. The slot receives a `RenderInfo`:

```ts
export type RenderInfo = Readonly<{
  trigger: ReadonlyArray<ChildAttribute>
  panel: ReadonlyArray<ChildAttribute>
  isVisible: boolean
}>
```

The consumer spreads `trigger` onto the trigger element and `panel` onto the panel element, and decides whether and how to render the panel content based on `isVisible`. Replaces main's `ViewConfig` shape (where `triggerContent` / `content` were fixed fields on the config) with the consistent `viewInputs.toView(renderInfo)` shape that lets the consumer assemble both elements directly.
