---
'@foldkit/ui': minor
---

Dialog emits a `Left` OutMessage once its element has closed. `Closed` is emitted when `RequestedClose` is processed, which for an animated dialog is before the leave animation runs, so a parent that drops the Dialog Model on `Closed` removes the element before it can animate out. `Left` is emitted when `CloseDialog` completes, after the leave animation for an animated dialog and immediately for a plain one, and also when the component resets itself to closed because showing the dialog or acquiring its resources failed, or the element unmounted while open.

Match `Left` in `foldOutMessage` to drop a Dialog that exists only in one variant of the parent Model, such as a dialog created with `Dialog.boot` when a menu item is chosen and discarded once it has gone. `Opened` and `Closed` behave as before. Exhaustive matches over `Dialog.OutMessage` need a `Left` arm.
