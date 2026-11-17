---
'foldkit': patch
---

Allow updates from `Subscription.animationFrameEntry` to render in the frame that delivers the tick instead of waiting for another frame. The runtime advances at most one render per application per frame and coalesces ticks into a render that is already pending.

Keep frame timing local to the application and its tick delivery. Messages from other applications or later browser tasks retain their next-frame scheduling. Cancel frame callbacks when their Subscription becomes inactive or is disposed.
