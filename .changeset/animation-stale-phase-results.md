---
'@foldkit/ui': minor
---

Keep an Animation leave running when it interrupts an enter. Previously, if an element was hidden while its enter transition was still running, it could be removed before its leave finished. The browser cancels the enter transition when the leave starts. The Command that waits for the enter then finishes and returns `EndedAnimation`. Animation treated this as the end of the leave and emitted `TransitionedOut` too early. Showing an element during its leave had the same problem the other way round. Dialog, Menu, Popover, Listbox, Combobox, and Toast use Animation, so they are fixed too.

The Animation Model has a new `transitionVersion` field. `show` and `hide` increase it each time they start an enter or a leave. `WaitForPaint` and `WaitForAnimationSettled` put this version in their result Messages. If the version in a result is not the current one, update ignores the result.

This is a breaking change. These public types and constructors change:

- `Animation.Model` has a new `transitionVersion: number` field. `Animation.init` sets it to `0`. Code that builds an Animation Model by hand, such as a test fixture, needs to add it.
- `Animation.Message.CompletedWaitForPaint` and `Animation.Message.EndedAnimation` now take `{ version }`.
- `Animation.WaitForPaint` now takes `{ version }`, and `Animation.WaitForAnimationSettled` takes `{ id, version }`.
- `Animation.OutMessage.StartedLeaveAnimating` now carries `{ version }`, the version of the leave that just started.
- The `DetectMovementOrAnimationEnd` Commands exported by Menu, Popover, Listbox, and Combobox now take `{ id, version }`.

`Animation.defaultLeaveCommand(model)` reads the version from the Model, so a parent that uses it needs no change. A parent with its own leave Command takes the version from `StartedLeaveAnimating` and returns it in `EndedAnimation`:

```ts
StartedLeaveAnimating: ({ version }) => model => ({
  model,
  commands: [liftCommand(WaitForPanelSettled({ version }))],
}),
```

```ts
const WaitForPanelSettled = Command.define('WaitForPanelSettled', {
  args: { version: Schema.Number },
  messages: [Animation.Message.EndedAnimation],
  execute: ({ version }) =>
    Dom.waitForAnimationSettled('#drawer-panel').pipe(
      Effect.as(Animation.Message.EndedAnimation({ version })),
    ),
})
```

Tests must use the right version when they resolve `WaitForPaint` or `WaitForAnimationSettled`, or when they send `EndedAnimation` directly. The version starts at `0`, and each `show` or `hide` that starts an enter or a leave adds one. For example, the first open is version `1`, and the close after it is version `2`. A result with a different version does not change the Model. `Toast.test.drainEntry` uses the right versions itself, so tests that call it need no change.
