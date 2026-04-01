---
'foldkit': patch
---

Fix arrow key navigation requiring two presses and tab-close not working in Listbox, Menu, and Popover. Arrow keys now delegate to the items keydown handler when the component is already open. Focus moves to the items container via the anchor `focusAfterPosition` option, which fires after the first position computation clears `visibility: hidden` — necessary because browsers ignore `.focus()` on hidden elements.
