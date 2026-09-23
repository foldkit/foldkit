---
'foldkit': patch
---

Keep memoized views live when an ancestor is replaced. When a `createLazy` or `createKeyedLazy` cache hit rendered under an ancestor that was re-keyed, changed tag, or switched branches, or when the cached subtree moved into another parent, the differ built the new DOM from the cached VNode that the outgoing tree still held. The outgoing tree's cleanup then ran against the new elements. The old Mount was never released while a second one started, buttons in the subtree stopped dispatching because their listeners were removed, and a subtree moved into an earlier sibling disappeared from the page.

The differ now builds DOM from a copy whenever a VNode already owns an element. The outgoing tree releases the elements it actually owns, and the new tree keeps its Mounts and event handlers. On the next render the cached VNode is diffed once against the copy and takes the DOM back, without running the view function again.

A cache hit at the same position still skips the diff entirely, and freshly built VNodes are created without copying.
