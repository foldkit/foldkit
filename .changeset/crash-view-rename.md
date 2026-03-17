---
'foldkit': minor
---

Replace `errorView` with grouped `crash` config containing `view` and `report`

**Breaking changes:**

- `errorView` config field removed — use `crash: { view }` instead
- `crash.view` receives `CrashContext<Model, Message>` (with `error`, `model`, and `message` fields) instead of a bare `Error`

**New features:**

- `crash.report` callback for side effects (e.g. Sentry) — runs before `crash.view` renders, receives the same `CrashContext`
- `CrashContext` and `CrashConfig` types exported from `foldkit`

**Migration:**

```ts
// Before
makeElement({
  errorView: error => myErrorView(error),
})

// After
makeElement({
  crash: {
    view: ({ error }) => myErrorView(error),
    report: ({ error, model, message }) => {
      Sentry.captureException(error, { extra: { model, message } })
    },
  },
})
```
