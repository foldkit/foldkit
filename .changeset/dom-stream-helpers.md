---
'foldkit': minor
---

Move browser Stream constructors and their types from `Subscription` to `Browser`. Use `Browser.streamFromEvent`, `Browser.streamFromEventFilterMap`, `Browser.streamFromEventFilterMapPreventDefault`, `Browser.streamFromMediaQuery`, and `Browser.streamFromKeyBindings` in place of the former `Subscription` exports. Rename `Subscription.persistent(stream)` to `Subscription.fromStream(stream)` for a Stream with no local Model dependencies. The browser helpers return Streams that can be composed before being passed to a Subscription entry or a Mount.
