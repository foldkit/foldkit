---
'foldkit': patch
---

Replace an existing `Dom.inertOthers` isolation when the same id is used again. One `Dom.restoreInert` for that id returns the page to its original state. A repeat with the same selectors leaves `inert` and `aria-hidden` in place. A second call used to drop the first cleanup and leave those attributes on the page after restore.
