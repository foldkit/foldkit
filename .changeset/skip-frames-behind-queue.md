---
'foldkit': patch
---

Prevent inputs bound with `h.Value` and `h.OnInput` from losing typed characters when a render frame runs before queued Messages update the Model.

Skip rendering while an over-budget Message drain is waiting to resume in a later task, including inside View Transition callbacks. Render after the queue catches up.
