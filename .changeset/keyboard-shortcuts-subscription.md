---
'foldkit': minor
---

Add `Subscription.keyboardShortcuts`, a declarative Stream helper for mapping single key presses, modifier combinations, and ordered key sequences to Messages. It resolves `Mod` to the platform modifier, suppresses shortcuts from editable elements and IME composition by default, ignores held-key repeats, expires incomplete sequences, validates ambiguous binding tables, and calls `preventDefault` for matched presses unless a binding opts out. Bindings can be enabled from Subscription dependencies when their availability follows the Model.

For example:

```ts
Subscription.keyboardShortcuts<Message>({
  bindings: [
    { shortcut: 'Mod+K', toMessage: () => Message.PressedSearchShortcut() },
    {
      shortcut: ['G', 'H'],
      toMessage: () => Message.PressedHomeShortcut(),
    },
  ],
})
```
