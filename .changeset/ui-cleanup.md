---
'foldkit': minor
---

Small consumer-facing changes that fall out of the Ui.\* shape migration.

### `Ui.X.lazy` removed across the board

`Ui.X.lazy` is removed from every component that exposed it: `Animation`, `Calendar`, `Checkbox`, `Combobox`, `DatePicker`, `Dialog`, `Disclosure`, `FileDrop`, `Listbox`, `Menu`, `Popover`, `RadioGroup`, `Slider`, `Switch`, `Tabs`, `Tooltip`, and `VirtualList`. An `import { lazy }` or a `Ui.X.lazy(...)` call from any of them no longer compiles.

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
  slotId: 'agree-to-terms',
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
      slotId: 'agree-to-terms',
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

### Removed type exports

`Ui.RadioGroup` no longer exports `OptionConfig`, `OptionAttributes`, or `NarrowedSelectedOption`, and `Ui.Tabs` no longer exports `TabConfig`. These named fields of the old `ViewConfig` shape; the slot-based `ViewInputs` shape replaces them.
