---
'foldkit': minor
---

Add `h.submodel` and a standalone `submodel` export from `foldkit/html`. Provides a Submodel embedding primitive that lets child views be pure functions of their own model, with the parent's Message wrapping declared as data at the embed site rather than threaded through the child via a `toParentMessage` callback.

```ts
// Parent view:
h.submodel({
  id: row.id,
  view: Counter.view, // pure (model) => Html, stable reference
  model: row.counter,
  wrapWith: GotCounterMessage, // referentially stable Message constructor
  wrapArgs: { id: row.id }, // primitive record of per-instance args
})

// Counter.view, no parent-awareness:
export const view = (model: Model): Html => {
  const h = html<Message>()
  return h.button([h.OnClick(ClickedIncrement())], ['+'])
}
```

Each `h.submodel` boundary registers a `{ wrapWith, wrapArgs }` descriptor in the runtime's scope registry, keyed by the chain of Submodel ids from root to here. The child view runs in that scope, and `h.OnClick(ChildMessage(...))` and other event attributes record the child's raw Message plus the scope id. At event-fire time, the runtime walks the scope chain inside-out and applies each registered wrap, producing the fully-wrapped Message before dispatching.

The data form is what makes memoization work across the Submodel boundary. The cached child VNode carries stable values (the child Message, the scope id string); the parent's per-render-fresh closure for wrapping doesn't enter the VNode at all. `wrapWith` is a module-scope Message constructor that compares by `===`, `wrapArgs` is a primitive record, and both are looked up from the registry at fire time. Wrapping the same Submodel in `h.list` memoizes cleanly — the cache hits when the child model didn't change, even if the parent re-rendered.

`inputs` (optional second view argument) carries slot content built in the parent's scope. The VNodes inside `inputs` keep the scope they were constructed in, so user-provided handlers inside slots dispatch through the user's chain rather than the embedded Submodel's wrapping.

Nested Submodels compose automatically: a deeper `h.submodel` extends the scope chain, and the wrapping at event-fire time walks the full chain from innermost to outermost. Child Submodels stay decoupled from the depth of their embedding.

Adds an `examples/counters` example demonstrating the pattern: a parent that hosts a dynamic list of `Counter` Submodels, each embedded via `h.submodel`. `Counter.view` is `(model: Counter.Model) => Html` with no parent-awareness — the same Counter would work unchanged under any host.

`createKeyedLazy`, `createLazy`, `h.list`, and the existing callback-style Submodel pattern (e.g. `someView<ParentMessage>(model, toParentMessage)`) all continue to work and are not deprecated. Existing apps and Foldkit's bundled `Ui.*` primitives still use the callback pattern; `h.submodel` is an additional embedding primitive for code that wants memoization-friendly boundaries.
