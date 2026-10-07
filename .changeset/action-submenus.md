---
'@foldkit/ui': minor
---

Add nested action submenus to Menu. Pass submenu entries among existing leaf items to open child panels with keyboard, pointer, or touch. Menu keeps one focus and dismissal owner for the tree, positions each child with a small overlap against its parent item, switches siblings without an empty frame, and emits `Selected` only for leaf actions. Selections from a Menu view include the full `path` and `indexPath`. Existing flat items and `Selected({ value, index })` constructors remain valid.
