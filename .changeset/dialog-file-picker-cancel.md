---
'@foldkit/ui': patch
'foldkit': patch
---

Fix `Dialog` closing when an inner file picker is canceled.

A file input (`<input type="file">` or the `FileDrop` component) rendered inside a `Dialog` would dismiss the whole dialog when its OS file picker was canceled. Chromium fires the parent modal `<dialog>`'s `cancel` event when an inner file picker is dismissed, indistinguishable from a genuine Esc, so the dialog treated it as a close request.

The dialog now calls `preventDefault` on the native `cancel` event and drives Esc-to-close from a `keydown` handler instead. A real Esc still closes the dialog, while the file picker's spurious `cancel` (which fires no keydown) becomes harmless.

Adds `h.OnCancelPreventDefault`, an attribute that binds the `cancel` event and calls `preventDefault` without dispatching a Message, for suppressing a modal `<dialog>`'s automatic close.
