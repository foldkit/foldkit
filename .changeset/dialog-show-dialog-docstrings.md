---
'@foldkit/ui': patch
---

Clarify the Dialog docstrings about how the native `<dialog>` is opened. The
`ShowDialog` command and the component view go through `Dom.showDialog`, which
calls `show()` rather than native `showModal()` so other high-z-index overlays
stay interactive. The docs now describe the high z-index, focus trap,
component-supplied backdrop, and `cancel` event on Esc instead of implying
native modal semantics.
