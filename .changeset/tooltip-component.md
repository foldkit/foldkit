---
'foldkit': minor
---

Add `Ui.Tooltip` — a headless tooltip primitive that opens on hover (after a configurable delay) or keyboard focus, and closes on pointer-leave, blur, Escape, or left-click of the trigger. Reuses the anchor positioning engine shared with `Popover` and `Menu`. Non-interactive panel with `role="tooltip"` and `aria-describedby` on the trigger.

Notable design choices:

- `showDelay` accepts any `Duration.DurationInput` (e.g. `300`, `Duration.millis(400)`, `Duration.seconds(1)`). Default is `Duration.millis(500)`.
- Mouse-click-induced focus does not auto-open; focus from keyboard, touch, or pen does. Mouse-click focus is disambiguated via a recorded pointer type that gets consumed on the next focus event.
- Left-click on an open tooltip dismisses it — the user is clicking the button for its action, not to keep the tooltip visible. The dismissal sets `isDismissed`, blocking re-opening until the user disengages (leaves or blurs). Same flag handles Escape dismissal.
- Hover and focus state are preserved truthfully during the dismissed window; the tooltip doesn't lie about its model.
- `Tooltip.setShowDelay(model, duration)` lets parents adjust the delay at runtime (e.g. for user preferences or reduced-motion settings). Also available as the `ChangedShowDelay` message for direct Submodel delegation.
