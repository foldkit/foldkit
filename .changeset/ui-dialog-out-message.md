---
'foldkit': minor
---

`Ui.Dialog.update` now returns `[Model, Commands, Option<OutMessage>]` (was `[Model, Commands]`). Adds two OutMessage variants mirroring `Ui.Popover`:

- `Opened()`: emitted once the dialog has transitioned to open (after `update` has processed the `RequestedOpen` request and `isOpen` reflects the new state).
- `Closed()`: emitted once the dialog has transitioned to closed. Programmatic `Dialog.close` on an already-closed model is a no-op that does not re-emit; calling close while a leave animation is already in progress is also a no-op.

`Ui.Dialog.open` and `Ui.Dialog.close` return the full 3-tuple as well. Existing 2-tuple destructures keep compiling.

Consumers reacting to dialog lifecycle as a domain event (focus restoration, analytics, scroll position) now have the canonical OutMessage path instead of pattern-matching internal `RequestedOpen`/`RequestedClose` Messages.
