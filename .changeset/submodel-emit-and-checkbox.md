---
'foldkit': minor
---

Major refinements to the `h.submodel` API, plus migration of `Ui.Checkbox` as the first Foldkit Ui primitive to use it.

**`SubmodelView` brand for ChildMessage inference.** Submodel views are now typed `SubmodelView<Model, Message, Inputs>`, a function intersected with a phantom `__submodelMessage: Message` field. `h.submodel` reads the brand to infer the child's Message type at the call site, so `wrapWith`'s `{ message }` destructure is correctly typed without manual annotation:

```ts
// Before: required explicit annotation
wrapWith: ({ message }: { message: Ui.Checkbox.Message }) =>
  GotCheckboxMessage({ message })

// After: inferred from view brand
wrapWith: ({ message }) => GotCheckboxMessage({ message })
```

`Parameters<View>` extracts `Model` and `Inputs` from the view's signature, so `h.submodel`'s `model` and `inputs` config fields are also fully inferred.

The brand is REQUIRED at the `h.submodel` call site (not optional). Unbranded plain functions fail to type-check rather than silently inferring `Message = never`. Build branded views with the new `defineSubmodelView<Model, Message, Inputs>(fn)` helper, which attaches the phantom brand without runtime overhead:

```ts
export const view = defineSubmodelView<Model, Message, ViewInputs>(
  (model, inputs) => h.div([...], [...])
)
```

**`emit` field for declarative event routing.** A per-tag handler map keyed by the child's Message `_tag` that takes precedence over `wrapWith` for matching tags. TypeScript narrows each handler's argument via `Extract`, so the parent can react to high-level child events without pattern-matching the child's full Message union inside `GotChildMessage`. Replaces the `onSelected*`-style callback prop pattern with one that lives in the data form and stays memoization-friendly (handlers live in the runtime registry, not the cached VNode).

**Slot callbacks auto-scope to the parent.** When `inputs` contains function values (e.g. `toView`), `h.submodel` wraps each to execute in the OUTER scope at call time. Handlers the consumer builds inside slot callbacks (`h.OnClick(MyAppMessage())` inside `toView`) dispatch through the parent's wrapping chain, NOT wrapped by the embedded Submodel. Eliminates a latent footgun where slot dispatchers would be wrongly captured in the child scope. The wrapping only recurses one level deep. Function values inside nested objects are NOT auto-wrapped.

**`wrapArgs` is now optional.** When the only argument `wrapWith` consumes is `message`, omit `wrapArgs` and the runtime supplies a shared frozen `{}`.

**Duplicate id detection.** Two `h.submodel` calls inside the same parent scope with the same `id` now throw a clear error at view-build time, rather than silently colliding in the wrap registry. Different parent scopes can still share child ids. The guard is per parent scope, not global.

**Wrap lifecycle tied to VNode lifecycle.** `h.submodel` attaches a snabbdom `destroy` hook to a COPY of its returned VNode that deregisters the scope's wrap when the DOM node is removed. Replaces the previous render-pass-based pruning, which was incorrect for `h.list` cache hits: a cached entry doesn't re-call `h.submodel`, so the old pruning would evict its wrap mid-flight and break dispatch from the cached VNode. With destroy-hook eviction, wraps persist as long as their VNode is in the tree, evict cleanly when removed (entries deleted from a list, conditional render flips), survive cache hits, and survive `h.list` reorder. Copying (rather than mutating) the VNode avoids contaminating any cached vnodes a view might return.

**Resilient wrap deregistration on view failure.** If the child view throws, `h.submodel` deregisters the wrap before propagating, so a runtime exception in user view code never leaks a wrap into the registry. If the view returns `null`, the wrap is deregistered eagerly (no VNode means no destroy hook will ever fire). `clearRuntime` now throws when called on an empty stack so unbalanced push/pop pairs upstream surface immediately instead of silently corrupting later renders.

**`Ui.Checkbox` migrated.** First Foldkit Ui primitive on the new shape. `Checkbox.view` is built with `defineSubmodelView<Model, Message, ViewInputs>` and branded with `SubmodelView<Model, Message, ViewInputs>`. No `ParentMessage` generic, no `toParentMessage` callback. `CheckboxAttributes` is typed `Attribute<never>` so consumers spread the attribute arrays directly into their own scope's elements. Slot callbacks in `inputs.toView` execute in the consumer's scope, so the consumer can mix their own `h.OnClick` handlers alongside the Checkbox-provided attributes and they'll dispatch correctly. `Ui.Checkbox.lazy` is removed. `h.submodel` provides the boundary memoization, and the old `lazy` was effectively a no-op (its cache key included `toParentMessage`, which was freshly constructed each render).

All Checkbox consumers updated: `job-application` (workEntry, educationEntry), `ui-showcase` (checkbox + fieldset views), `website` (checkbox + fieldset pages, demo snippets). The transitional pattern at consumer sites that still use the callback-style chain (workEntry et al.) constructs `wrapWith` as a per-render closure. The Checkbox view re-renders each parent pass until the surrounding chain migrates too. When the chain is fully migrated, `wrapWith` becomes a stable reference and the boundary memoizes end-to-end.

Migrating the rest of the Ui primitives is the next step. The patterns established here carry over: `defineSubmodelView<Model, Message, Inputs>`, `Attribute<never>` for slot attributes, slot callbacks dispatching through the parent's scope.
