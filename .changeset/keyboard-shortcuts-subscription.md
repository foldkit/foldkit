---
'foldkit': minor
---

Add `Subscription.keyboardShortcuts`, a declarative keyboard-shortcut Stream helper over `fromEventFilterMap`. Bindings are either a bare key or `mod` combo (`{ keys: 'mod+k' }`) or a vim-style prefix chord (`{ chord: ['g', 'l'] }`) mapped to a Message. Shortcuts are `inField`-aware by default, so they never fire while the user types in an `input`, `textarea`, `select`, or `contentEditable` element, and `whileTyping: 'Allow'` opts a binding back in. The pending chord prefix lives inside the Stream, not the Model, so apps drop the hand-written `keydown` subscription, the `inField` guard, and the `goPending` state. `preventDefault` runs synchronously inside the browser's dispatch, defaulting on for `mod` combos and off for bare keys and chords.
