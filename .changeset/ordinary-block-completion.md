---
'foldkit': minor
'@foldkit/ui': patch
'create-foldkit-app': patch
---

Complete ordinary Block implementations with a record:

```ts
export const layer = ApplicationBlock.makeLayer({
  init,
  update,
  view,
  subscriptions,
  EffectsLayer,
}).pipe(Layer.provide(Layer.mergeAll(MessageComposer.layer, History.layer)))
```

The init plan selects the Composition whose registered children are acquired when the Layer is built. All implementation plans must belong to that Composition. Configuration stays passive; acquisition retains Layer memoization, Scope, dependencies, errors, identities and cleanup without running init or starting handlers and Model-driven lifecycles.

Replace constructors that only collect children by removing their Effect wrapper, acquireChildren call and returned children field together. Childless implementations use the same record form. Provide child implementation Layers explicitly.

Custom Effect constructors remain supported for actual construction dependencies or scoped work. They acquire and return their own children; the record form rejects explicit children, bindings and operations fields. Effects must return their implementation rather than carrying attached init and update plans. Inline, local and extracted builders retain their existing contracts and inference.

Host-handler selection also accepts Services and constructor errors within the Block's declared effects bounds. It retains those exact channels and rejects foreign providers, including invalid alternatives hidden in a provider union.

The examples, Website, Typing Game, UI and Query implementations, scaffolds and active guidance use record completion as the ordinary default.
