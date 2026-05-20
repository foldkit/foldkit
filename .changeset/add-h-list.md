---
'foldkit': minor
---

Add `h.list` and a standalone `list` export from `foldkit/html`. Renders a keyed list with built-in lazy memoization, replacing the common `createKeyedLazy()` + manual `Array.map` + `h.keyed` composition with one call.

```ts
const todoItemView = (todo: Todo, editingText: Option<string>): Html => ...

// Inside a view function:
h.ul(
  [h.Class('todo-list')],
  h.list(
    filteredTodos,
    todo => todo.id,
    todoItemView,
    todo => [maybeEditingTextFor(model.editing, todo.id)],
  ),
)
```

Each rendered VNode has its `key` set from `getKey(item)` so the parent does not need `h.keyed`. The cache lives in a `WeakMap` keyed by the `view` function reference, so memoization works when `view` is declared at module scope (the recommended pattern) and falls back to "no cache" when `view` is inlined fresh per render — same semantics as `createLazy`.

The optional fourth argument `getExtras` declares per-item dependencies beyond the item itself. Args are compared by reference equality, matching `createKeyedLazy`. Stale entries (keys not appearing in the current render) are pruned automatically so the cache does not grow unbounded.

Internal benchmark (`internal/lustre-benchmark`, optimised TodoMVC runbook of 100 add + 100 toggle + 100 destroy, median of 5 runs):

- Naive (no memoization): 1659 ms
- Optimised with `createKeyedLazy`: 328 ms
- Optimised with `h.list`: 334 ms (within 2% of `createKeyedLazy`)

No existing API is removed or deprecated. `createKeyedLazy` remains available for cases that need a free-standing lazy cache (e.g. multiple memoized slots in one view, non-list memoization patterns).
