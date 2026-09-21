---
'foldkit': minor
---

Add `Subscription.fromMediaQuery`, a Stream helper that answers a CSS media query. It emits `mapMatches(matches)` once when the Stream's scope opens, with the value in effect at that moment, and again on every `change` event. Before this there was no primitive for a media query in the Model: an app that wanted to honor `prefers-reduced-motion`, follow `prefers-color-scheme`, or react to a viewport breakpoint read `window.matchMedia(query).matches` separately at boot and hand-rolled a `change` listener, and that pair of pieces was copied between projects. With the helper, an entry that only needs the value in the Model has no separate read.

The initial emission is what a `change` listener alone cannot provide. `change` fires only on transitions, so an entry gated on the Model that restarts after its gate reopens never learns what changed while it was closed. `fromMediaQuery` re-reads the query on every restart, so a color-scheme entry that is active only while the preference is `System` picks up an operating-system theme switch made while the preference was `Dark`.

```ts
const subscriptions = Subscription.make<Model, Message>()(_entry => ({
  reducedMotion: Subscription.persistent(
    Subscription.fromMediaQuery({
      query: '(prefers-reduced-motion: reduce)',
      mapMatches: isMatching =>
        Message.ChangedReducedMotion({ isReduced: isMatching }),
    }),
  ),
}))
```

`window.matchMedia` is called inside the acquire Effect, never at construction, so building the Stream at module load or during server rendering touches no browser global. The listener is registered with `Effect.acquireRelease` and removed when the scope closes. The helper returns a Stream, so it composes like `Subscription.fromEvent`: wrap it in `Subscription.persistent` or gate it with `Stream.when` inside a `Subscription.make` entry. Existing helpers are unchanged.
