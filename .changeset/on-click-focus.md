---
'foldkit': minor
---

Add `h.OnClickFocus(focusSelector, message)` attribute for click handlers that need to synchronously focus another element before dispatching their Message.

The attribute's framework handler runs `document.querySelector(focusSelector)?.focus()` inside the originating click event, then dispatches the Message. Because the focus call lives inside the user-gesture handler, iOS Safari opens the on-screen keyboard, which `Dom.focus` cannot achieve (Commands fork through `Effect.forkDetach` + `requestAnimationFrame` and resolve after the gesture context has expired).

When the real input only mounts later, such as a search field inside a dialog, focus it in two steps. The element you focus has to exist when the tap fires, and you cannot open the dialog first because that happens a frame later, after the gesture ends. So point `OnClickFocus` at an always-present, visually hidden text input (the "keyboard warmup"); the tap focuses the input (which opens the keyboard) and dispatches a Message. update's branch for that Message opens the dialog and returns a `Dom.focus` Command pointed at the real input. By the time the Command runs the dialog has mounted, so focus moves there. iOS keeps the keyboard up when focus moves between two text inputs, so it stays open and now targets the real input.

```ts
h.button(
  [
    h.AriaLabel('Search documentation'),
    h.OnClickFocus('#search-keyboard-warmup', ClickedSearch()),
  ],
  [Icon.magnifyingGlass()],
)
```

Like `OnKeyDownPreventDefault`, the side effect lives inside the framework's snabbdom handler so view code stays declarative.
