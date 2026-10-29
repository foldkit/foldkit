---
'foldkit': minor
---

`h.OnInput` passes the caret position after each edit as a second argument, an `Option<InputSelection>` holding the target's `selectionStart` and `selectionEnd`. A mention picker or autocomplete can now complete the word under the caret instead of only text typed at the end of the field. Handlers that take only the value are unaffected. `InputSelection` is a Schema exported from `foldkit/html`, so a Message can carry it as `Schema.Option(InputSelection)`.

```ts
h.OnInput((value, maybeSelection) =>
  Message.UpdatedNote({ value, maybeSelection }),
)
```

The selection is `Some` for a `textarea` and for `text`, `search`, `url`, `tel`, and `password` inputs, and `None` for other input types, such as `email` and `number`, and for a `Contenteditable` host.

Scene's `type` step takes an optional `{ selectionStart, selectionEnd }` after the text. Without it, the caret sits at the end of the typed text.
