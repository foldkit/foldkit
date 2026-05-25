---
'foldkit': minor
---

Submodels become first-class. A new `h.submodel` primitive (also exposed as `submodel` from `foldkit/html`) embeds a child view as a pure function of its own model. A new top-level `Submodel` namespace exports `defineView`, `View`, and `Config`.

### `h.submodel`

```ts
// Parent view:
h.submodel({
  slotId: row.id,
  model: row.counter,
  view: Counter.view,
  toParentMessage: message => GotCounterMessage({ id: row.id, message }),
})

// Child view, no parent-awareness:
export const view = Submodel.defineView<Model, Message>(model => {
  const h = html<Message>()
  return h.button([h.OnClick(ClickedIncrement())], ['+'])
})
```

The parent-Message wrap is declared as data at the embed site via `toParentMessage` and resolved through a runtime scope registry at event-fire time. The cached child VNode carries stable values; the per-render-fresh wrap closure does not enter the VNode. This is what enables memoization across Submodel boundaries.

`viewInputs` (optional second view argument) carries slot content built in the parent's boundary. Top-level function values in `viewInputs` are auto-wrapped to execute in the parent's boundary so user-provided handlers inside slots dispatch through the user's chain, not the embedded Submodel's. Function values nested below the top level (inside object fields or array elements) throw at view-build time with a path-based error like `viewInputs.config.onSubmit`. The check is runtime-only because TypeScript cannot structurally distinguish a user-declared nested callback from a data value whose prototype carries methods, so a misuse compiles cleanly and surfaces the first time the boundary renders.

Nested Submodels compose automatically: a deeper `h.submodel` extends the boundary chain, and wrapping at event-fire time walks the full chain from innermost to outermost.

### `Submodel.defineView`

`Submodel.defineView` is REQUIRED for views passed to `h.submodel`. Plain view functions fail to type-check at the embed site rather than silently inferring `Message = never`. Build views with `Submodel.defineView<Model, Message, ViewInputs>(fn)`:

```ts
export const view = Submodel.defineView<Model, Message, ViewInputs>(
  (model, viewInputs) => h.div([...], [...])
)
```

`Submodel.View` and `Submodel.Config` are accessible as types under the namespace for cases where consumers annotate them directly. Most consumers never do; the view itself carries the inference, so `h.submodel`'s `model` and `viewInputs` config fields are fully inferred.

### `childAttributes`

A new `childAttributes` helper (and companion `ChildAttribute` type) is exported from `foldkit/html`. Use it in `toView` slot callbacks to mark attribute lists that originate inside the child Submodel and should keep their handlers bound to the child's dispatch, even though the call site lives in the parent's boundary.

```ts
import { type ChildAttribute, childAttributes } from 'foldkit/html'

return viewInputs.toView({
  button: childAttributes([h.OnClick(Toggled())]),
  panel: childAttributes([h.Id(panelId(model.id))]),
})
```

`childAttributes` is "what the child publishes to the parent" in the same role-named vocabulary as `viewInputs` (parent → child view), `context` (parent → child update), and `OutMessage` (child → parent update). Every interactive Foldkit UI primitive uses it internally.

### Boundary semantics

- **Duplicate slotId detection.** Two `h.submodel` calls inside the same parent boundary with the same `slotId` throw at view-build time, naming both call sites and the convention: `slotId` is DOM-slot identity, not model identity. If the same model is rendered in two locations (desktop + mobile, master + detail), each slot needs its own id. Detection works across `createLazy` / `createKeyedLazy` cache hits: the lazy helpers capture the boundary ids registered during their first run and replay them on cache hit, so a sibling collision against a memoized entry throws instead of silently overwriting its wrap.
- **Wrap lifecycle tied to VNode lifecycle.** `h.submodel` attaches a snabbdom `destroy` hook that deregisters the scope's wrap when the DOM node is removed. Wraps persist as long as their VNode is in the tree, evict cleanly on removal, survive cache hits, and survive reorder.
- **Resilient wrap deregistration on view failure.** If the child view throws, the wrap is deregistered before propagating. If it returns `null`, the wrap is deregistered eagerly.
- **Lazy dispatch capture in element constructors.** `h.div(...)`, `h.code(...)`, etc. no longer require an active runtime frame when their attribute list contains no event-bearing attributes. Static Html fragments constructed at module top level (`const fragment = h.code([h.Class('x')], ['text'])`) now succeed. Event-bearing Html constructed outside a render still fails at event-fire time with a clear message, rather than at import time with an opaque trace.

### `examples/counters`

Ships as a new example demonstrating the pattern: a parent that hosts a dynamic list of `Counter` Submodels, each embedded via `h.submodel`. `Counter.view` is `(model: Counter.Model) => Html` with no parent-awareness; the same Counter would work unchanged under any host.

### Ui.\* implications

Every Ui.\* component's `view` is now a pure `(model, viewInputs?) => Html` typed via `Submodel.defineView` rather than `<ParentMessage>(config: ViewConfig)`. Embed via `h.submodel({ view: Ui.X.view, ... })` instead of calling `Ui.X.view({ ... })` directly. See `ui-out-messages.md` and `ui-selection-factory.md` for per-component migration details.
