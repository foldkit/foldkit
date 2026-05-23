---
'foldkit': minor
---

`Ui.Toast.make(payloadSchema)` now returns a runtime whose `update` produces `[Model, Commands, Option<OutMessage>]` (was `[Model, Commands]`). Adds a new `DismissedToast({ payload })` OutMessage variant, emitted once an entry finishes its leave animation and is being removed from the model. The payload is typed as your `Payload` schema, so consumers can lift the dismissal directly into a domain Message.

Why the emit moment is `TransitionedOut`, not `Dismissed`: the internal `Dismissed` Message only requests the start of the leave animation. Firing `DismissedToast` at request time would emit too early — the entry is still visible and the parent might want to react when the dismissal actually completes (cleanup, analytics, resolving a pending Action). The OutMessage fires from `delegateToEntryAnimation`'s `TransitionedOut` arm, which is also where the entry is removed from `model.entries`.

The factory now also returns `OutMessage` (the Schema union) and `DismissedToast` (the constructor) alongside the existing `Message`, `Added`, etc.:

```ts
const Toast = Ui.Toast.make(ToastPayload)
// Toast.OutMessage, Toast.DismissedToast — new
// Toast.Message, Toast.Added — unchanged
```

Existing 2-tuple destructures keep compiling.
