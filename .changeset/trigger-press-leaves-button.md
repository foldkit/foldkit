---
'@foldkit/ui': minor
---

A `Popover`, `Menu`, or `Listbox` closes again when focus leaves it after a mouse press that started on the trigger and ended somewhere else. Say you press the mouse on the trigger, drag off it, and release away from it. The browser fires no `click` on the trigger, so the overlay kept ignoring blur and stayed open when you tabbed away.

The trigger now dispatches the new `MovedPointerOffButton` Message when a mouse pointer leaves it, and `update` stops ignoring blur from that point. If the pointer returns and you release on the trigger, the browser does fire a `click`, and that click now toggles the overlay.

A right or middle mouse press on the trigger no longer makes the overlay ignore blur. The browser fires no `click` on the trigger for those buttons. When the overlay is open and that press moves focus out of it, the overlay now closes.
