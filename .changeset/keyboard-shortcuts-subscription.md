---
'foldkit': minor
---

Add `Subscription.keyboardShortcuts`, a declarative keyboard-shortcut helper that maps a binding table to Messages. Bindings cover single keys (`'/'`, `'Escape'`), modifier combos (`'mod+k'`, where `mod` is Cmd on macOS or Ctrl elsewhere), and vim-style chords (`['g', 'l']`). Every binding is `inField`-aware by default — it does not fire while focus is inside an `input`, `textarea`, `select`, or `contentEditable` element, so shortcuts never steal keystrokes mid-word; opt a binding out with `whileTyping: 'Allow'`. A matched binding calls `preventDefault` unless it sets `preventDefault: false`. Returns a Stream to wrap with `Subscription.persistent`, replacing the hand-rolled `keydown` subscription plus `update` state machine most apps rebuild.
