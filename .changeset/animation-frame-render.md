---
'foldkit': patch
---

`Subscription.animationFrame` renders the Model from each tick before that frame paints. A tick used to request its render from inside the frame callback, so the browser deferred it and the next tick folded into that pending render. The view ran on every other frame.
