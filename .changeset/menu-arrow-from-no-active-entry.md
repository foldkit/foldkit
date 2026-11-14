---
'@foldkit/ui': patch
---

Start arrow-key navigation from the first or last enabled item when an open Menu or Combobox has no active item. A Menu has no active item after it opens from a pointer click or `open`, and after the pointer leaves an item it activated. A Combobox has no active item after it opens from its toggle button, on focus or from `open`, and after the pointer leaves an item it activated. In that state, pressing ArrowDown in a Menu activated the second item and skipped the first, and pressing ArrowUp in a Combobox activated the second-to-last item instead of the last.

With no active item, ArrowDown and Home activate the first enabled item, and ArrowUp and End activate the last enabled item. In a Menu and a Listbox, PageUp and PageDown do the same as Home and End. Menu, Combobox and Listbox resolve these keys the same way, which matches the WAI-ARIA menu and listbox patterns and the arrow keys that open each component from its button or input. Navigation from an active item is unchanged.
