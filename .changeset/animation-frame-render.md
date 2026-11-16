---
'foldkit': patch
---

Allow updates from `Subscription.animationFrameEntry` to render in the frame that delivers the tick instead of waiting for another frame. The Runtime advances at most one render per application per frame and coalesces ticks into a render that is already pending. Ordinary Messages outside the callback phase retain their next-frame scheduling.
