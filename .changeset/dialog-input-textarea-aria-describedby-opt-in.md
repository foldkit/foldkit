---
'@foldkit/ui': minor
---

Gate `aria-describedby` on an explicit opt-in in `Ui.Dialog`, `Ui.Input`, and
`Ui.Textarea`. Each component previously emitted `aria-describedby` pointing at
a `${id}-description` element on every render, even when no description was
rendered, producing a dangling ARIA reference. The attribute is now emitted only
when you opt in: pass `hasDescription: true` to `Input.view` / `Textarea.view`,
or set `hasDescription: true` in the Dialog `viewInputs`. Set it only when you
actually render the description element carrying the matching id (via
`Input.descriptionId`, `Textarea.descriptionId`, or `Dialog.descriptionId`).
