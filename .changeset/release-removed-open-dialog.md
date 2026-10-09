---
'foldkit': patch
'@foldkit/ui': patch
---

Release the resources of an open dialog when its element leaves the document. `Dom.showDialog` now watches the document while a dialog is open. When the open `<dialog>` is removed without a `Dom.closeDialog`, it releases the scroll lock, focus trap, key handler, background isolation, return focus, and stack entry, as `Dom.releaseDialogResources` does.

Before this change, a `@foldkit/ui` Dialog that was open when its page was removed left the next page scroll locked, with Escape and Tab still handled for the detached element. For a Dialog opened after its element mounted, the `Unmounted` Message was the only release path for a removed element, and `Update.foldChild` drops that Message when the same update removes the Model that owns the Dialog.
