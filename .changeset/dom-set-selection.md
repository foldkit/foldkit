---
'foldkit': minor
---

Add `Dom.setSelection(selector, { selectionStart, selectionEnd })`, which sets the caret or selected range of a `textarea` or text input from a Command. When update rewrites a field's value, rendering the new value moves the browser caret to the end. `Dom.setSelection` waits for that render to commit, so it can place the caret after an inserted completion, such as a mention picked from a list. It sets only the selection and does not call `focus()`. It fails with `ElementNotFound` when the selector does not match a `textarea` or a `text`, `search`, `url`, `tel`, or `password` input.
