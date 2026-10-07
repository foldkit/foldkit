---
'foldkit': minor
---

Move browser Stream constructors and their types from `Subscription` to `Dom`. Use `Dom.streamFromEvent`, `Dom.streamFromEventFilterMap`, `Dom.streamFromEventFilterMapPreventDefault`, `Dom.streamFromMediaQuery`, and `Dom.streamFromKeyBindings` in place of the former `Subscription` exports. These helpers return composable Streams. Use `Subscription.persistentEntry` for a Stream with no local Model dependencies, or pass a Stream to a Model-driven Subscription entry or a Mount.
