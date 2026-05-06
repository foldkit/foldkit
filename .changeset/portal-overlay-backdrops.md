---
'foldkit': minor
---

Fix click interception when multiple overlay components appear on the same page. With one of `Ui.Listbox`, `Ui.Combobox`, `Ui.Menu`, or `Ui.Popover` open, clicking another overlay's button required two clicks: one to dismiss the open overlay's backdrop, then another to register on the target button. The bug was asymmetric, depending on which component appeared later in the DOM.

The fix portals each component's backdrop into a shared `foldkit-portal-root` div prepended to `document.body`. The prepend matters: appending to body would keep the backdrop later in tree order than the page's overlay wrappers (which are `position: relative; z-index: auto`), and the wrappers' buttons would still paint underneath. Prepending puts the backdrop earlier in tree order so wrappers paint above it in normal interaction, while the backdrop still catches clicks on empty space for click-outside dismissal.

`Ui.DatePicker` inherits the fix via its delegation to `Ui.Popover`. `Ui.Dialog` is unaffected (uses near-max z-index, not portals). `Ui.Tooltip` is unaffected (no backdrop).

Each affected component's `Message` union gains a `CompletedBackdropPortal` tag. This is only a breaking change for consumers who exhaustively match the component's `Message` variants in a parent update. Add a no-op branch for `CompletedBackdropPortal` if you hit this.
