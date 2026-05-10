---
'foldkit': minor
---

Replace `slowView` with a unified `slow` runtime config that measures four synchronous phases of the update cycle: `update`, `view`, `patch`, and `subscriptions`. Each phase has its own threshold and can be enabled or disabled independently. **Breaking change**: the `slowView` config field is removed.

```ts
import { Runtime } from 'foldkit'

Runtime.makeProgram({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root')!,
  slow: {
    show: 'Always',
    onSlow: context => {
      Sentry.captureMessage(
        `[foldkit slow] ${context._tag} ${context.durationMs.toFixed(1)}ms`,
      )
    },
    view: { thresholdMs: 12 },
    update: { thresholdMs: 4 },
    patch: { thresholdMs: 8 },
    subscriptions: { thresholdMs: 1 },
  },
})
```

Each phase opts in independently. Set the phase to `{}` for defaults, `{ thresholdMs?, onSlow? }` to override, or `false` to disable. A phase left `undefined` is also disabled, so `slow: { view: {} }` produces only view warnings. Top-level `show` and `onSlow` apply to every enabled phase; per-phase `onSlow` overrides them when set.

The four phases:

- **`view`** measures the time to build the next VNode tree. Default budget `16ms`. Slow when computation that should live in `update` or behind `createLazy` leaks into `view`.
- **`update`** measures the synchronous reducer call. Default budget `4ms`. Slow when expensive work runs in `update` instead of being deferred to a Command.
- **`patch`** measures the VNode diff and DOM mutation. Default budget `8ms`. Slow when lists are unkeyed, when a single render touches a huge subtree, or when stable subtrees aren't memoized.
- **`subscriptions`** measures `modelToDependencies` per subscription on every Model change. Default budget `2ms` per subscription. The callback's context includes a `subscriptionKey` for attribution.

The callback receives a `SlowContext<Model, Message>` tagged union (`_tag: 'View' | 'Update' | 'Patch' | 'Subscriptions'`), which is the natural shape for forwarding all phases to a single sink. Phase-specific narrow types are also exported (`SlowViewContext`, `SlowUpdateContext`, `SlowPatchContext`, `SlowSubscriptionsContext`) for typing per-phase callbacks.

Migration from the old `slowView`:

```ts
// Before
slowView: {
  thresholdMs: 50,
  onSlowView: context => log(context),
}

// After
slow: {
  view: {
    thresholdMs: 50,
    onSlow: context => log(context),
  },
}
```

If you previously disabled the warning entirely with `slowView: false`, the equivalent kill switch is `slow: false`:

```ts
// Before
slowView: false

// After
slow: false
```
