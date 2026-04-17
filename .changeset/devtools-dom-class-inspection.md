---
'foldkit': patch
---

DevTools state inspector now displays `File`, `Blob`, `Date`, and `URL` instance contents instead of rendering them as empty objects. The useful data on these browser classes lives on prototype getters, which the previous key-enumeration walk couldn't see. The inspector now unwraps them into plain-object views (e.g. `{ name, size, type, lastModified }` for `File`) before flattening the tree, so consumers can see at a glance which file was dropped or which date was selected.

Scope is intentionally narrow: only the four classes above are handled. `FileList`, `FormData`, `Map`, `Set`, and other collection-shaped builtins still render as empty objects. Extending coverage is one branch per type in `toInspectableValue`.
