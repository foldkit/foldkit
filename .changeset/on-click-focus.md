---
'foldkit': minor
---

Add `h.OnClickFocus(focusSelector, message)` attribute for click handlers that need to synchronously focus another element before dispatching their Message.

The attribute's framework handler runs `document.querySelector(focusSelector)?.focus()` inside the originating click event, then dispatches the Message. Because the focus call lives inside the user-gesture handler, iOS Safari opens the on-screen keyboard, which `Dom.focus` cannot achieve (Commands fork through `Effect.forkDetach` + `requestAnimationFrame` and resolve after the gesture context has expired).

Pair it with a small always-rendered hidden text input ("keyboard warmup") and use a follow-up `Dom.focus` Command to transfer focus to the real input once it mounts. iOS keeps the keyboard up across a programmatic focus transfer between two text inputs.

```ts
h.button(
  [
    h.AriaLabel('Search documentation'),
    h.OnClickFocus('#search-keyboard-warmup', OpenedSearchDialog()),
  ],
  [Icon.magnifyingGlass()],
)
```

Like `OnKeyDownPreventDefault`, the side effect lives inside the framework's snabbdom handler so view code stays declarative.
