---
'foldkit': patch
---

Draw a Message from an animation frame Subscription in the frame it arrives. A `requestAnimationFrame` call made while a frame runs belongs to the next frame, and `Subscription.animationFrameEntry` requests its next tick before its Message is processed. The render that Message scheduled therefore ran one frame later, behind the next tick, and drew both ticks at once. Apps that animate from `animationFrameEntry` drew every other display frame, so motion moved in steps of two frames.

After a frame renders, the runtime now requests the next frame's render callback from a task after that frame, which puts it behind the Subscription's next tick. When the tick's Message marks a render, the callback draws it in the same frame. When nothing changed, the callback returns and stops requesting frames, so an idle app costs one empty animation frame callback.

A render frame that finds a Message drain deferred for exceeding its time budget now runs that drain first, since the running frame means the browser already got control back, and renders the result in the same frame. Frames are still skipped while a drain is behind: if the drain exceeds the budget again, it defers again and the frame waits for it.
