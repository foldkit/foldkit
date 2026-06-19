---
'foldkit': patch
---

Dedupe shared `VNode` constants reused inside memoized views. `createLazy` and
`createKeyedLazy` now dedupe their freshly built subtree on a cache miss, against
a per-render set shared with the top-level pass, so a const reused inside a
memoized view, or across memoized siblings, is cloned just like one reused in a
plain view. A cache hit still returns the identical object, preserving the
same-vnode short-circuit. Reusing a plain `VNode` value is now safe everywhere,
with no exception for memoized views.
