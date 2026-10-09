---
'@foldkit/ui': minor
---

Add nested action submenus to Menu. Pass submenu entries among existing leaf items to open child panels with keyboard, pointer, or touch. Menu keeps one focus and dismissal owner for the tree, positions each child with a small overlap against its parent item, switches siblings without an empty frame, and gives the pointer time to move diagonally into an open child panel. Activating an open submenu trigger closes that child. Only leaf actions emit `Selected`. Selections from a Menu view include the full `path` and `indexPath`. Existing flat items and `Selected({ value, index })` constructors remain valid.

Menu keyboard navigation and typeahead include disabled items so assistive technology can announce their unavailable state. Initial keyboard focus selects an enabled item, and disabled items cannot be activated.

Open submenu triggers expose `data-open`. They omit `aria-expanded` while a valid child item is active to prevent VoiceOver from announcing the trigger's state change over that child. Empty submenus retain the expanded state, and closed triggers expose `aria-expanded="false"`.
