---
'@foldkit/ui': patch
---

Menus opened with an empty item list retain no active item during keyboard opening and navigation, omit `aria-activedescendant`, and issue no item click or scroll Commands.

When the parent clears or shortens the supplied items, the view ignores a retained active index that no longer identifies an item. This also prevents stale keyboard activation and dangling active-descendant references while preserving the Menu Model for subsequent renders.
