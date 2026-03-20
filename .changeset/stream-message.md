---
'foldkit': minor
---

Subscriptions emit Stream<Message> instead of Stream<Command<Message>>

Subscription streams now emit Messages directly. For subscription callbacks with side effects (like `event.preventDefault`), use `Stream.mapEffect`.

**Breaking changes:**

- `depsToStream` returns `Stream<Message>` instead of `Stream<Command<Message>>`
- Remove Effect wrappers from subscription stream emissions

**Migration:**

```ts
// Before:
Stream.map(() => Effect.succeed(Ticked()))

// After:
Stream.map(Ticked)
```
