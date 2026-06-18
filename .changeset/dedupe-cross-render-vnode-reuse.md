---
'foldkit': patch
---

Clone any reused `VNode` object the runtime encounters before patching, so a
view fragment held as a shared `const` no longer corrupts diffing. Snabbdom
records each element's live DOM node by mutating `vnode.elm` in place and
assumes one `VNode` object per tree position. A module- or closure-level
constant (`const icon = h.span(...)`) re-enters the next render still carrying
the `.elm` snabbdom set last time; when its position shifts toward an earlier
sibling, the new slot is patched before the old one is removed, so the removal
deletes the freshly placed node and the element appears stuck on its previous
row. `dedupeSharedVNodes` now freshens any `VNode` arriving with an `.elm`
already set, in addition to the within-render duplicates it already handled.
`createLazy` and `createKeyedLazy` results are exempt, since they return the
same object by reference on purpose and rely on snabbdom's same-vnode
short-circuit, as do `createLazy`/`createKeyedLazy` views embedded through
`h.submodel`, so memoization still composes across a Submodel boundary. Reusing
a plain `VNode` value across positions is now safe; factories are no longer
required to avoid this.
