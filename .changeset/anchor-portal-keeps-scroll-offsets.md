---
'@foldkit/ui': patch
---

Keep scroll offsets when Anchor portals an element. A Mount on an element inside a Popover, Menu, Listbox, Combobox, or Tooltip panel runs before the panel moves into its portal root, and a browser resets the scroll offsets inside an element that moves. A list that such a Mount scrolled to the selected row was back at the top once the panel opened. `portalToContainingRoot`, `portalBackdrop`, and the portal step of `anchorSetup` now restore the scroll offsets of the moved element and of the elements inside it.
