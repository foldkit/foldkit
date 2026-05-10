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

Each phase opts in independently. Set the phase to `{}` for defaults, `{ thresholdMs }` to override, or `false` to disable. A phase left `undefined` is also disabled, so `slow: { view: {} }` produces only view warnings. `slow: false` disables every phase at once.

The four phases:

- **`view`** measures the time to build the next VNode tree. Default budget `16ms`. The remediation hint points at `createLazy` / `createKeyedLazy`.
- **`update`** measures the synchronous reducer call. Default budget `4ms`. The remediation hint points at memoization, narrowing per-Message work, and splitting the Model. Deferring to a Command is only useful when the result isn't needed for the immediate next Model.
- **`patch`** measures the VNode diff and DOM mutation. Default budget `8ms`. The remediation hint points at keying mapped lists by stable id, splitting large views, and `createLazy`.
- **`subscriptions`** measures `modelToDependencies` per subscription on every Model change. Default budget `2ms` per subscription. The context carries a `subscriptionKey` for attribution.

The single top-level `onSlow` callback receives a tagged `SlowContext<Model, Message>` union (`_tag: 'View' | 'Update' | 'Patch' | 'Subscriptions'`). Discriminate on `_tag` to route per phase. TypeScript narrows the rest of the context automatically.

Slow view and patch warnings are silenced during DevTools time-travel replays so the parked-thread time during inspection doesn't trigger spurious warnings attributed to "init". Update and subscriptions are unaffected by replay by construction.

Default thresholds are intentionally generous. Treat warnings as signals to investigate, not problems to silence: confirm with a profiler before optimizing, prefer clear code, and don't add a `createLazy` without a measurable improvement.

Migration from the old `slowView`:

```ts
// Before
slowView: {
  thresholdMs: 50,
  onSlowView: context => log(context),
}

// After
slow: {
  view: { thresholdMs: 50 },
  onSlow: context => {
    if (context._tag === 'View') {
      log(context)
    }
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
