---
'@foldkit/ui': patch
---

Menus opened with an empty item list retain no active item during keyboard opening and navigation, omit `aria-activedescendant`, and issue no item click or scroll Commands.
