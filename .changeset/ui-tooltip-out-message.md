---
'foldkit': minor
---

`Ui.Tooltip.update` now returns `[Model, Commands, Option<OutMessage>]` (was `[Model, Commands]`). Adds two OutMessage variants:

- `Shown()` — emitted once the tooltip transitions to visible (`isOpen` becomes true).
- `Hidden()` — emitted once the tooltip transitions to hidden (`isOpen` becomes false).

Only fires on actual visibility transitions, not on internal state changes (hover, focus, delay updates), so consumers don't get spurious events. Useful for analytics, instrumentation, or coordinating with other transient UI.

`Ui.Tooltip.setShowDelay` returns the same 3-tuple. Existing 2-tuple destructures keep compiling.
