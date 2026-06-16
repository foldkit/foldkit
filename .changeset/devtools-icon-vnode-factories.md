---
'@foldkit/devtools': patch
---

Render the overlay's pause icon, inline diff dot, and other shared markers from
zero-arg factories so each tree position gets its own `VNode`. Snabbdom records
each element's live DOM node by mutating `vnode.elm` in place, so a single
`VNode` object reused across positions (within a render, or at a different
position across renders) aliased one `.elm` across multiple DOM nodes. During
time travel this left the pause icon on previously selected rows and let diff
dots flicker onto the wrong row. The same shape affected the empty inspector
placeholder, which a single `VNode` rendered into every (simultaneously
present) tab panel. The `pauseIconView`, `inlineDiffDotView`, `diffDotView`,
`checkIconView`, `arrowUpIconView`, and `emptyInspectorView` constants are now
factories that return a fresh `VNode` per call site.
