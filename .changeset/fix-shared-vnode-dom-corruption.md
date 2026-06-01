---
'foldkit': patch
---

Fix DOM corruption when the same vnode value is rendered in more than one position within a single render.

Reusing a view value across positions, for example a `const checkmark = h.span(...)` placed into several slots, previously left those positions sharing a single DOM reference. Removals and text updates then landed on the wrong node, so repeated toggles accumulated stale elements and a moved selection indicator could stick to its old position. The runtime now gives each position its own DOM node before patching. Trees that never reuse a vnode are unaffected, and `createLazy` / `createKeyedLazy` memoized subtrees keep their fast path.
