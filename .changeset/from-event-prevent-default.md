---
'foldkit': minor
---

Adds `Subscription.fromEventPreventDefault`, the cancelling variant of `Subscription.fromEventFilterMap`. Its `toMessage` returns `Option.some(message)` to mark a dispatch handled. The helper evaluates the mapper, calls `event.preventDefault()`, and queues the Message before the native listener returns; `Option.none()` leaves the default behavior intact. The mapper never calls `preventDefault()` itself, mirroring `h.OnKeyDownPreventDefault` from `foldkit/html`.

Some browsers default wheel and touch listeners on global targets to passive, where `preventDefault()` is ignored. Because cancelling is the point, the helper registers its listener with `passive: false` when the config does not specify it. Passing `passive: true` explicitly contradicts the helper's purpose and throws at construction.

The TSDoc for `fromEvent` and `fromEventFilterMap` now explains that `preventDefault()` is ineffective in a passive listener and shows the `options: { passive: false }` fix.
