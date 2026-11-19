---
'@foldkit/ui': minor
---

Dialog emits two new OutMessages. `CompletedClose` fires once the close has finished and the element is closed: after the leave animation for an animated dialog, and right after `Closed` for a plain one. `FailedOpen` fires when the dialog could not be shown or could not acquire its resources, and has reset itself to closed.

`Closed` fires when `RequestedClose` is processed, before any leave animation, so a parent that drops the Dialog Model on `Closed` removes the element before it can animate out. Drop it on `CompletedClose` instead. A dialog that never opened does not emit `Closed`; `FailedOpen` is the signal for that case. `Opened` and `Closed` are unchanged. Exhaustive matches over `Dialog.OutMessage` need arms for the two new variants.
