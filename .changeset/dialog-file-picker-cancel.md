---
'foldkit': minor
'@foldkit/ui': patch
---

Keep `Dialog` open when a file picker inside it is canceled. The dialog now suppresses native `cancel` events and responds only to the distinct cancel signal that `Dom.showDialog` dispatches for an unhandled Escape on the topmost Dialog.

Add `h.OnCancelPreventDefault` for preventing a native `cancel` event without dispatching a Message, with an optional Message for a synthetic `CustomEvent` signal.
