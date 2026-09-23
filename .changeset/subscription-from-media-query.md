---
'foldkit': minor
---

Add `Subscription.fromMediaQuery`, which creates a Stream from a CSS media query. When the Stream starts, it emits the query's current `matches` value through `mapMatches`. It emits again whenever the value changes. Apps can map those results to Messages for reduced motion, system color scheme, or a viewport breakpoint without combining a boot-time read with a hand-written listener.

Each time the Stream restarts, it reads and emits the current value again. Suppose a color-scheme Subscription runs only while the theme preference is `System`. The user selects `Dark`, changes the operating system to a light theme, and then selects `System` again. A new `change` listener waits for the next change, so the Model still records a dark system theme. `fromMediaQuery` reads the current light value as soon as the Stream restarts.

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

Creating the Stream does not access `window`; `window.matchMedia` is called only when the Stream starts. Stopping the Stream removes its listener. The helper returns a Stream, so pass it to `Subscription.persistent` or gate it with `Stream.when` inside a `Subscription.make` entry.
