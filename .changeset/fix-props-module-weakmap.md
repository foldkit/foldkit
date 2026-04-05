---
'foldkit': patch
---

Track managed DOM properties per-element via WeakMap instead of relying on the old vnode's data for cleanup. This makes property reset (e.g. `disabled → false`) work regardless of whether snabbdom patches or recreates the element.
