---
'@foldkit/ui': minor
---

Let one HoverIntent serve many triggers that share a panel, instead of one HoverIntent per trigger that closes and reopens the panel as the pointer moves between them. Spread `RenderInfo.keyedTrigger(key)` onto each trigger and render the panel for `RenderInfo.maybeActiveTriggerKey`. Moving between triggers while the panel is open hands it to the new trigger at once, and only the latest trigger's open wait can open it. The new `EnteredKeyedTrigger`, `LeftKeyedTrigger`, `FocusedKeyedTrigger`, `BlurredKeyedTrigger`, and `PressedEscapeOnKeyedTrigger` Messages carry the trigger's `key`. The unkeyed `trigger` bundle and its Messages behave as before; the Model gains a `maybeActiveTriggerKey` field that stays `None` for them.
