---
'@foldkit/ui': patch
---

Opening a modal Popover, Menu, Listbox, or Combobox that is already open is a no-op. A second open used to take the scroll lock and the inert isolation again, so one close left the page scroll-locked. The same guard covers a non-modal overlay. A second `Popover.open` returns the current Model and no `Opened` OutMessage. A second open of a Menu or Listbox returns no `FocusItems`, and it leaves the typeahead query and the active item as they are.
