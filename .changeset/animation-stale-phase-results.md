---
'@foldkit/ui': minor
---

Keep an Animation leave running when it interrupts an enter. Previously, if an element was hidden while its enter transition was still running, it could be removed before its leave finished. The browser cancels the enter transition when the leave starts. The Command that waits for the enter then finishes and returns `EndedAnimation`. Animation treated this as the end of the leave and emitted `TransitionedOut` too early. Showing an element during its leave had the same problem the other way round. Dialog, Menu, Popover, Listbox, Combobox, and Toast use Animation, so they are fixed too.

The Animation Model has a new `transitionGeneration` field. `show` and `hide` increase it each time they start an enter or leave transition. `WaitForPaint` and `WaitForAnimationSettled` put this generation in their result Messages. If the generation in a result is not the current one, update ignores the result.

This is a breaking change. These public types and constructors change:

- `Animation.Model` has a new `transitionGeneration: number` field. `Animation.init` sets it to `0`. Code that builds an Animation Model by hand, such as a test fixture, needs to add it.
- `Animation.Message.CompletedWaitForPaint` and `Animation.Message.EndedAnimation` now take `{ generation }`.
- `Animation.WaitForPaint` now takes `{ generation }`, and `Animation.WaitForAnimationSettled` takes `{ id, generation }`.
- `Animation.OutMessage.StartedLeaveAnimating` now carries `{ generation }`, the generation of the leave that just started.
- The `DetectMovementOrAnimationEnd` Commands exported by Menu, Popover, Listbox, and Combobox now take `{ id, generation }`.

`Animation.defaultLeaveCommand(model)` reads the generation from the Model, so a parent that uses it needs no change. A parent with its own leave Command takes the generation from `StartedLeaveAnimating` and returns it in `EndedAnimation`:

```ts
const WaitForPanelSettled = Command.define('WaitForPanelSettled', {
  args: { generation: Schema.Number },
  messages: [Animation.Message.EndedAnimation],
  execute: ({ generation }) =>
    Dom.waitForAnimationSettled('#drawer-panel').pipe(
      Effect.as(Animation.Message.EndedAnimation({ generation })),
    ),
})
```

```ts
const foldAnimationOutMessage = (
  outMessage: Animation.OutMessage,
  { liftCommand }: Update.FoldContext<Animation.Message, Message>,
) =>
  Animation.OutMessage.match<Update.Step<Model, Message>>(outMessage, {
    StartedLeaveAnimating:
      ({ generation }) =>
      model => ({
        model,
        commands: [liftCommand(WaitForPanelSettled({ generation }))],
      }),
    TransitionedOut: () => model => ({ model }),
  })
```

Tests must use the right generation when they resolve `WaitForPaint` or `WaitForAnimationSettled`, or when they send `EndedAnimation` directly. The generation starts at `0`, and each `show` or `hide` that starts an enter or a leave adds one. For example, the first open is generation `1`, and the close after it is generation `2`. A result with a different generation does not change the Model. `Toast.test.drainEntry` uses the right generations itself, so tests that call it need no change.
