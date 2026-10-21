---
'foldkit': patch
---

Keep default slow warnings compact by logging only the phase summary, timing, Message tag or Subscription key, and advice. Stop passing full Model and Message payloads to `console.warn`. Custom `slow.onSlow` callbacks still receive the full typed context.
