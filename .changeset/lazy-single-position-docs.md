---
'foldkit': patch
---

Document the single-position constraint in the `createLazy` and `createKeyedLazy` TSDoc. A cached VNode can only be rendered at one position in the tree; rendering the same cached VNode at two positions causes snabbdom's patches to collide and can duplicate or misplace DOM nodes. If the same content needs to appear in multiple positions, create a separate lazy slot for each position.
