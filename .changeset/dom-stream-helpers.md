---
'foldkit': minor
---

Move browser Stream constructors and their types from `Subscription` to `Dom`. Use `Dom.fromEvent`, `Dom.fromEventFilterMap`, `Dom.fromEventFilterMapPreventDefault`, `Dom.fromMediaQuery`, and `Dom.keyBindings` in place of the former `Subscription` exports. Rename `Subscription.persistent(stream)` to `Subscription.fromStream(stream)` for a Stream with no local Model dependencies. The browser helpers still return Streams and can be composed before being passed to a Subscription entry or a Mount.
