---
'foldkit': patch
---

Return a controlled input to its rendered `value` when `update` refuses an edit. A render writes `value` only when it differs from the value of the previous render, and a Message that leaves the Model unchanged schedules no render at all. When `update` refused an edit, such as a letter typed into a field that accepts digits, the Model held `12` and the input went on showing `12x`.

After an `input` or `change` event whose handlers dispatch a Message, the runtime now returns the edited element to the `value` it was last rendered with, as soon as the DOM on screen is the view of the current Model. A refused edit that returns the same Model is undone at once, without a render. A refused edit that returns a new Model with the same text is undone after its frame. An accepted edit is left alone.

An edit waits while its Message is in a deferred drain, the same way a render frame does. Text that an input method is composing is left in place, because writing `value` ends the composition, and the element is corrected when the composition ends. An element whose event dispatches no Message, such as `h.Value` with only `h.OnChange` while the user types, is not touched.
