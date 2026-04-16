---
'foldkit': patch
---

Fix Popover panel never receiving focus on open.

FocusPanel/FocusItems commands raced the anchor module's async positioning
pipeline — they called element.focus() while the panel was still
visibility:hidden, which is a no-op. Focus is now owned entirely by the
anchor module: after the first computePosition resolves and clears
visibility, a requestAnimationFrame defers the focus call so the element
is painted before focus fires. A new focusSelector option lets consumers
target a descendant (e.g. DatePicker focuses the calendar grid instead of
the panel).

Affects Popover, Menu, and DatePicker. Consumers using FocusPanel or
FocusItems in story test setups should remove the resolve step — these
commands are no longer dispatched on open.
