---
'foldkit': minor
---

Submodels become first-class. A new `h.submodel` primitive (also exposed as `submodel` from `foldkit/html`) embeds a child view as a pure function of its own model. A new top-level `Submodel` namespace exports `defineView`, `View`, and `Config`.

### `h.submodel`

```ts
// Parent view:
h.submodel({
  id: row.id,
  view: Counter.view,
  model: row.counter,
  toParentMessage: message => GotCounterMessage({ id: row.id, message }),
})

// Child view, no parent-awareness:
export const view = Submodel.defineView<Model, Message>(model => {
  const h = html<Message>()
  return h.button([h.OnClick(ClickedIncrement())], ['+'])
})
```

The parent-Message wrap is declared as data at the embed site via `toParentMessage` and resolved through a runtime scope registry at event-fire time. The cached child VNode carries stable values; the per-render-fresh wrap closure does not enter the VNode. This is what enables memoization across Submodel boundaries.

`viewInputs` (optional second view argument) carries slot content built in the parent's boundary. Top-level function values in `viewInputs` are auto-wrapped to execute in the parent's boundary so user-provided handlers inside slots dispatch through the user's chain, not the embedded Submodel's. Functions nested below the top level (inside object fields or array elements) are rejected at compile time by a mapped type on `SubmodelConfig.viewInputs`, with the same shape also enforced at view-build time as a defensive net for type-escape cases (`as any` casts, dynamic input construction). The natural list-shaped API (`viewInputs: { items: [{ onSelect }] }`) trips both gates and surfaces the misuse before a misrouted Message leaks.

Nested Submodels compose automatically: a deeper `h.submodel` extends the boundary chain, and wrapping at event-fire time walks the full chain from innermost to outermost.

### `Submodel.defineView`

The brand is REQUIRED at `h.submodel` call sites. Unbranded plain functions fail to type-check rather than silently inferring `Message = never`. Build branded views with `Submodel.defineView<Model, Message, ViewInputs>(fn)`:

```ts
export const view = Submodel.defineView<Model, Message, ViewInputs>(
  (model, viewInputs) => h.div([...], [...])
)
```

`Submodel.View` and `Submodel.Config` are accessible as types under the namespace for cases where consumers annotate them directly. Most consumers never do; the brand and `Parameters<View>` carry the inference, so `h.submodel`'s `model` and `viewInputs` config fields are also fully inferred.

### Boundary semantics

- **Duplicate id detection.** Two `h.submodel` calls inside the same parent boundary with the same `id` throw at view-build time, naming both call sites and the convention: `id` is DOM-position identity, not model identity. If the same model is rendered in two locations (desktop + mobile, master + detail), each position needs its own id.
- **Wrap lifecycle tied to VNode lifecycle.** `h.submodel` attaches a snabbdom `destroy` hook that deregisters the scope's wrap when the DOM node is removed. Wraps persist as long as their VNode is in the tree, evict cleanly on removal, survive cache hits, and survive reorder.
- **Resilient wrap deregistration on view failure.** If the child view throws, the wrap is deregistered before propagating. If it returns `null`, the wrap is deregistered eagerly.
- **Lazy dispatch capture in element constructors.** `h.div(...)`, `h.code(...)`, etc. no longer require an active runtime frame when their attribute list contains no event-bearing attributes. Static Html fragments constructed at module top level (`const fragment = h.code([h.Class('x')], ['text'])`) now succeed. Event-bearing Html constructed outside a render still fails at event-fire time with a clear message, rather than at import time with an opaque trace.

### `examples/counters`

Ships as a new example demonstrating the pattern: a parent that hosts a dynamic list of `Counter` Submodels, each embedded via `h.submodel`. `Counter.view` is `(model: Counter.Model) => Html` with no parent-awareness; the same Counter would work unchanged under any host.

### Ui.\* implications

Every Ui.\* component's `view` is now a pure `(model, viewInputs?) => Html` typed via `Submodel.defineView` rather than `<ParentMessage>(config: ViewConfig)`. Embed via `h.submodel({ view: Ui.X.view, ... })` instead of calling `Ui.X.view({ ... })` directly. See `ui-out-messages.md` and `ui-selection-factory.md` for per-component migration details.
