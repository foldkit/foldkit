---
'foldkit': minor
---

Make `OnInput` read from `Contenteditable` hosts. A contenteditable element has
no `value`, so previously its `input` events could not be observed declaratively
and the host had to masquerade as a form control by defining a `value` getter.
`OnInput` now reads the host's rendered text (`innerText`, falling back to
`textContent`) when the target has no string `value`, so plain `OnInput` works
on a contenteditable host. `OnChange` reads its value the same way. Form
controls are unaffected: they still report their `value`.

Add `OnBeforeInput` and `OnBeforeInputPreventDefault` for editor-grade input on
a contenteditable host. Both receive the edit's `inputType` and its `data` as an
`Option` (`None` for edits that carry no text, such as most deletions).
`OnBeforeInputPreventDefault` returns an `Option<Message>`: `Some` cancels the
native edit (via `preventDefault`) and dispatches, letting `update` own the
document mutation instead of reconciling after the browser has already edited
the DOM; `None` lets the native edit proceed. This catches edits that never
surface as a keystroke, such as autocorrect and spellcheck replacements. Not
every `beforeinput` is cancelable: during IME composition the edit is
non-cancelable, so `OnBeforeInputPreventDefault` lets it proceed and `OnInput`
reconciles the result.

The test harness gains `Scene.typeContentEditable` to drive `OnInput` and
`Scene.beforeInput` to drive `OnBeforeInput` / `OnBeforeInputPreventDefault` on
a contenteditable element.
