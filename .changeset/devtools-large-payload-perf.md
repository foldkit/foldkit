---
'foldkit': patch
---

Fix two DevTools regressions introduced by the Effect 4 migration.

**1. Hang on every dispatch when Messages carry large payloads.**
Effect 4 changed `Equal.equals` for plain objects from reference equality to
structural equality (hash + record compare). `Schema.toEquivalence` falls back
to `Equal.equals` for `S.Unknown`, so the DevTools overlay's
`maybeInspectedModel` and `maybeInspectedMessage` fields (typed as
`S.Option(S.Unknown)`) caused the runtime's per-dispatch `modelEquivalence`
check to walk the entire user-app Message payload three times per dispatch
(two hashes plus a record compare). With large payloads the cost manifested
as a roughly one-second hang on every user interaction.

The overlay now annotates those fields with reference-equality
`toEquivalence`, which is the correct semantics for through-traffic snapshots,
and disables `freezeModel` on the overlay's runtime so `deepFreeze` no longer
walks the inspected payload either. Both changes are scoped to the overlay;
user app runtimes are unaffected.

**2. Arrays in the inspector tree rendered as `[object Object],[object Object],...`**
Effect 4 narrowed `Predicate.isObject` to exclude arrays (v3 returned `true`
for arrays; v4 returns `false`). The DevTools tree renderer's `isExpandable`
check used `Predicate.isObject`, so array values were treated as leaves and
fell through to `String(value)`. The renderer now uses
`Predicate.isObjectOrArray`, which is Effect 4's spelling of v3's `isObject`
behavior.

**3. Slow tab switching in the inspector when the inspected Model is large.**
Two compounding issues. First, the inspector's tab group did not pass
`persistPanels`, so switching tabs unmounted the previous panel's DOM and
re-mounted the next one from scratch — for a large Model with expanded array
branches, this meant tearing down and rebuilding thousands of DOM rows per
tab switch. Second, even with persisted panels, every overlay re-render
re-invoked each tab's panel-content function, which for the Model tab meant
a fresh `flattenTree` walk over the full inspected snapshot. The inspector
now passes `persistPanels: true` (avoiding DOM thrash) and wraps each tab's
content in `createKeyedLazy` keyed on its actual dependencies (avoiding
recomputation when those dependencies are reference-equal across renders).

**4. Slow tree expansion when many sibling rows are visible.**
`toInspectableValue` (the transform that converts DOM-class instances like
File / Blob / Date / URL into plain objects for tree rendering) recursed
through arrays and records via `Array_.map` / `Record.map`, which allocate
fresh wrappers even when the contents are identical. Every render of the
inspector tree therefore produced a brand-new tree of references, defeating
the row-level `lazyTreeNode` cache: each row's `node.value` was a fresh
reference per render, so `argsEqual` failed on every row and every visible
row's vnode was rebuilt on every expansion. `toInspectableValue` is now
memoized by input reference via `WeakMap`, so identical snapshot references
return identical transformed references and the row lazy actually hits.
