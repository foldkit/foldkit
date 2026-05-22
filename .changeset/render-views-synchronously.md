---
'foldkit': minor
---

Render views synchronously. The `Html` type changes from `Effect<VNode | null, never, Dispatch>` to `VNode | null`. Element constructors read dispatch from a runtime-managed singleton set up around each render rather than pulling it from Effect context. The fiber-loop wrapper around every `h.div(...)`, `h.input(...)`, etc. is gone.

`html()` now memoizes its factory result across calls. The ~320 element and attribute constructors carry no per-program state, so the same cached object serves every render. This makes the recommended pattern of binding `const h = html<Message>()` inside view (recommended in 5338579) zero-cost.

`buildVNodeData` hoists its `Match.tagsExhaustive` dispatch object once per `buildVNodeData` call instead of once per attribute, and accumulates into `VNodeData` fields with `Object.assign` instead of spreading.

`createLazy` and `createKeyedLazy` keep dispatch identity in their cache key so DevTools `jumpTo` renders (which set up the runtime with `noOpDispatch`) do not return live-dispatch-bound VNodes to subsequent live renders. The per-(outerDispatch, boundaryId) Submodel dispatcher cache makes the dispatch reference stable across renders within a single outerDispatch, so lazy hits are common in steady state.

Together these reduce lustre-labs/benchmark TodoMVC numbers (100 items, Chrome) from 5,650 ms to 1,570 ms naive (-72%) and from 580 ms to 376 ms optimised (-35%). Direct per-render view + patch time drops from 1.43 ms to 0.53 ms (-63%).

Migration: code that built `Html` values via `Effect.gen` or `Effect.succeed` should now return `VNode | null` directly. View functions written with the `html()` factory require no changes.
