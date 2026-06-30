---
'foldkit': minor
'@foldkit/ui': minor
---

Rename `Dom.showModal` to `Dom.showDialog` and `Dom.closeModal` to
`Dom.closeDialog`.

The old names implied native `HTMLDialogElement.showModal()` semantics, but
`Dom.showModal` deliberately calls `element.show()` plus a manual focus trap
and a high z-index so DevTools and other overlays stay interactive above the
dialog. `Dom.closeModal` wraps native `.close()`. The new names drop the
misnomer and match the already-`Dialog`-flavored internals and the `Ui.Dialog`
Commands.

Migration: rename `Dom.showModal` to `Dom.showDialog` and `Dom.closeModal` to
`Dom.closeDialog` at every call site. Behavior is unchanged.
