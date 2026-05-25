---
'foldkit': minor
---

Render views synchronously. The `Html` type changes from `Effect<VNode | null, never, Dispatch>` to `VNode | null`. Element constructors read dispatch from a runtime-managed singleton set up around each render rather than pulling it from Effect context. The fiber-loop wrapper around every `h.div(...)`, `h.input(...)`, etc. is gone.

`html()` now memoizes its factory result across calls. The ~320 element and attribute constructors carry no per-program state, so the same cached object serves every render. This makes the recommended pattern of binding `const h = html<Message>()` inside view (recommended in 5338579) zero-cost.

`buildVNodeData` hoists its `Match.tagsExhaustive` dispatch object once per `buildVNodeData` call instead of once per attribute, and accumulates into `VNodeData` fields with `Object.assign` instead of spreading.

`createLazy` and `createKeyedLazy` keep dispatch identity in their cache key so DevTools `jumpTo` renders (which set up the runtime with `noOpDispatch`) do not return live-dispatch-bound VNodes to subsequent live renders. The per-(outerDispatch, boundaryId) Submodel dispatcher cache makes the dispatch reference stable across renders within a single outerDispatch, so lazy hits are common in steady state.

The synchronous render path is the largest single contributor to this release's perf overhaul; see the release notes for the bundled before/after numbers.

Migration: code that built `Html` values via `Effect.gen` or `Effect.succeed` should now return `VNode | null` directly. View functions written with the `html()` factory require no changes.
