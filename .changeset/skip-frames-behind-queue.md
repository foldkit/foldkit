---
'foldkit': patch
---

Fix controlled inputs losing typed characters when Messages arrive faster than the runtime processes them. A Message drain that runs past its 5ms budget hands the rest of the queue to a later task. A render frame that ran in between painted a Model without those Messages, so an input bound with `h.Value` and `h.OnInput` was set back to its older value and the next keystroke built on that, dropping the character for good.

A render frame now skips painting while a drain is waiting for that later task, and paints in a following frame once the drain has caught up. A View Transition's update callback makes the same check: it skips the transition without changing the page, and the next frame paints. During a long burst of Messages the browser keeps getting frames, but the view shows the result once the burst has been processed rather than its intermediate states.
