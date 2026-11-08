---
'foldkit': patch
---

Render continuous animation-frame Subscription ticks in each display frame instead of combining two ticks into every other frame. The Runtime arms a render callback after the preceding frame's task, following the next Subscription tick. An idle application stops requesting frames after one unchanged callback.

A render frame can resume a Message drain deferred by the queue's time budget. If the drain exceeds the budget again, rendering waits until the queue catches up. Existing generation checks, delivery receipts, View Transitions and scoped cleanup are preserved.
