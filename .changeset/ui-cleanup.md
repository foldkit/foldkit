---
'foldkit': minor
---

Small consumer-facing changes that fall out of the Ui.\* shape migration.

### `Ui.Checkbox.lazy` removed

`Ui.Checkbox.lazy` was a no-op in practice: its cache key included a per-render-fresh `toParentMessage` closure, so the comparison missed every render. The new `h.submodel` boundary design keeps per-render closures out of the cached VNode, so a parent-side `createLazy` / `createKeyedLazy` around `h.submodel` now actually hits.

Migration: switch to plain `Ui.Checkbox.view` embedded via `h.submodel`. Wrap with `createLazy` / `createKeyedLazy` at the parent's call site if you want memoization (the wrapping is per-instance, not per-component, so it lives where the Checkbox is rendered).

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
  view: Ui.Checkbox.view,
  model: model.agreeToTerms,
  toParentMessage: message => GotCheckboxMessage({ message }),
  inputs: {
    /* ... slot content if needed */
  },
})

// After (with memoization, parent-side):
const lazyCheckbox = createLazy()
// ... inside view:
lazyCheckbox(
  () =>
    h.submodel({
      id: 'agree-to-terms',
      view: Ui.Checkbox.view,
      model: model.agreeToTerms,
      toParentMessage: message => GotCheckboxMessage({ message }),
    }),
  [model.agreeToTerms],
)
```

### `Ui.Tooltip` exposes `RenderInfo` for slot content

Tooltip's `view` now takes a `toView` slot via `inputs`, consistent with the slot-based pattern used across Ui.\*. The slot receives a new `RenderInfo`:

```ts
export type RenderInfo = Readonly<{
  isVisible: boolean
}>
```

The consumer decides whether and how to render the tooltip content based on `isVisible`. Replaces main's `ViewConfig.toView(model)` shape with the consistent `inputs.toView(renderInfo)` shape.
