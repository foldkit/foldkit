---
'foldkit': patch
---

Dialogs opened with `Dom.showDialog` ignore Escape keydowns with `isComposing` or `keyCode === 229`. Canceling an IME composition no longer dispatches `cancel` or dismisses the dialog.

An ordinary Escape dispatches `cancel` on the topmost dialog unless its default action was already prevented.
