# Animation

## Overview

Animation coordinates CSS enter and leave phases with a state machine and data attributes. Create an `Animation.Animation` instance in the parent's constructor and hold it in the parent Model. The parent starts transitions by sending it `RequestedShow()`, `RequestedHide()`, or `RequestedToggle()`. Animation's own update records each lifecycle phase in its Model and returns the Commands that wait for paint and settlement. The transitions stay visible in DevTools and can be tested through update without waiting for a browser animation.

Animation reports what happens through [OutMessages](/core/block#surfacing-facts). The parent handles `StartedLeaveAnimating` by sending `RequestedWaitForLeaveSettlement()` or by starting its own Command, and handles `TransitionedOut` when post-animation cleanup can begin. Dialog, Menu, Popover, Listbox, and Combobox use the same Block internally when `isAnimated` is true.

## Lifecycle Coordination {#why}

CSS can animate between two rendered styles, but an application still has to stage those styles across paints and keep a leaving element mounted until its animations finish. Animation coordinates three parts of that lifecycle.

### Entering Content

First, an entering element renders with `data-closed`. Animation waits for paint before removing that attribute, so the browser sees the change and starts the CSS animation.

### Leaving Content

Second, browser animation settlement does not enter update on its own. When the parent receives `StartedLeaveAnimating`, it sends the instance `RequestedWaitForLeaveSettlement()`. Animation update returns a Command that waits for every transition and keyframe animation reported by the element's Web Animations API, then sends `EndedAnimation`. Animation responds with `TransitionedOut`, which tells the parent that it can unmount content or perform other cleanup.

### Animating Size

Third, `animateSize: true` supplies the nested CSS grid structure needed to animate content between collapsed and expanded rows without measuring its height in JavaScript. It keeps the hidden content mounted at zero height instead of removing it.

### When to Use Animation Directly

Use Animation directly when your own content needs the same lifecycle. Components such as Dialog, Menu, Popover, Listbox, and Combobox already provide it through their `isAnimated` option.

:::Info{label="See it in an app"}
Check out how Animation is wired up in a [real Foldkit app](https://github.com/foldkit/foldkit/blob/main/examples/ui-showcase/src/page/animationPage.ts).
:::

## Examples

Send the instance `Animation.Animation.Message.RequestedShow()` to start the enter animation and `RequestedHide()` to start the leave animation. Provide `Animation.AnimationLive` to the parent's Layer. Style with Tailwind data-attribute selectors like `data-[closed]:opacity-0`.

::Demo{name="animation"}

::Snippet{name="uiAnimationBasic" label="Animation"}

## Lifecycle

### Enter and Leave Responsibilities

Animation drives the enter phase to completion on its own. The leave phase hands control back to the parent halfway through so the parent can decide how settlement is detected. For example, Foldkit's [Dialog](/ui/dialog) just waits for CSS, while its [Popover](/ui/popover) races CSS against the anchor button scrolling off-screen. The asymmetry exists because leave detection varies by consumer, while enter detection does not.

`RequestedShow`, `RequestedHide`, and `RequestedToggle` are requests. Animation's update decides which transition to start from its current Model.

```diagram
ENTER                                LEAVE
Animation drives completion          Parent detects settlement

RequestedShow                        RequestedHide
   |                                    |
   v                                    v
EnterStart                           LeaveStart
   | rAF x 2                            | rAF x 2
   v                                    v
EnterAnimating                       LeaveAnimating
   | EndedAnimation (internal)          +-> emits StartedLeaveAnimating
   v                                    |   parent requests the standard wait
 Idle                                   |
                                        |   Command sends
                                        |   EndedAnimation
                                        v
                                       Idle
                                        +-> emits TransitionedOut
                                            parent handles cleanup
```

The double-rAF timing (one frame to set the start state, another to trigger the animation) ensures browsers flush layout between phases so the CSS animation actually plays.

### Interrupted Transitions

Say a user closes a panel while it is still sliding in. `RequestedHide` starts the leave, and the browser reverses the running transition. Reversing cancels the enter transition, so the Command waiting for the enter to settle resolves and returns `EndedAnimation` while Animation is already leaving.

#### Ignore Stale Settlement

Animation ignores that late result. Each time `RequestedShow` or `RequestedHide` starts an enter or leave transition, Animation increases `transitionGeneration` in its Model. Every paint and settlement Command reports the transition generation that scheduled it, and update ignores a result whose generation is no longer current. The leave keeps running until its own settlement result arrives. The same holds when `RequestedShow` interrupts a leave.

#### Build a Custom Leave Command

`RequestedWaitForLeaveSettlement()` reads the current generation inside Animation's update. A custom leave is a parent Command that gets the generation from `StartedLeaveAnimating` and reports it in a parent Message. The parent's handler for that Message sends the instance `RequestedFinish({ generation })`:

::Snippet{name="uiAnimationCustomLeave" label="Custom leave Command"}

## Styling

Animation is headless. You style its lifecycle with CSS transitions or CSS keyframe animations, and the state machine advances after every animation returned by `element.getAnimations()` has settled. With `animateSize: true`, Animation also adds a fixed 200ms CSS grid-row transition and the wrappers it requires.

For CSS transitions, use data-attribute selectors like `data-[closed]:opacity-0 data-[closed]:scale-95` together with a `transition` property on the element. For CSS keyframe animations, apply an `animation` shorthand scoped to `data-[enter]` or `data-[leave]`. The state machine waits for every animation returned by the element's `getAnimations()` call to settle.

### Animate the Wrapper

Animation waits on the element with its `id`, which is the wrapper it renders. It does not look at descendants. If the transition is on a child instead, the wait finds no running animations and resolves on the next frame, so the phase ends before the child has moved. Put the animated styles on the wrapper through `className`. A custom leave Command can wait on the child during the leave, but the enter always waits on the wrapper.

### Keep Leave Animations Finite

Leave animations must be finite. `animation-iteration-count: infinite` never fires `animationend`, which leaves the state machine in `LeaveAnimating` forever and the element in the DOM. Reserve infinite animations for decorative or ambient effects that don’t gate a leave phase.

### Size Animation

The `animateSize` option uses CSS grid (`grid-template-rows: 0fr` → `1fr`) for smooth height animation without JavaScript measurement.

| Attribute         | Condition                                                                              |
| ----------------- | -------------------------------------------------------------------------------------- |
| `data-closed`     | Present during `EnterStart` and `LeaveAnimating`. Target this for hidden-state styles. |
| `data-enter`      | Present during the enter animation.                                                    |
| `data-leave`      | Present during the leave animation.                                                    |
| `data-transition` | Present during any animation phase.                                                    |

## API Reference

### InitConfig {#init-config}

The args a parent passes when it creates an instance with `new`.

| Name        | Type      | Default | Description                           |
| ----------- | --------- | ------- | ------------------------------------- |
| `id`        | `string`  | —       | Unique ID for the animation instance. |
| `isShowing` | `boolean` | `false` | Initial visibility state.             |

### Messages a Parent Sends {#messages}

Send these to the instance from a parent update handler, as in `messages: [model.animation.send(Animation.Animation.Message.RequestedShow())]`.

| Message                             | Description                                                                                                                                                                                                                             |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RequestedShow()`                   | Starts the enter lifecycle.                                                                                                                                                                                                             |
| `RequestedHide()`                   | Starts the leave lifecycle.                                                                                                                                                                                                             |
| `RequestedToggle()`                 | Starts the enter or leave lifecycle according to the instance's `isShowing` value.                                                                                                                                                      |
| `RequestedWaitForLeaveSettlement()` | Uses Animation's standard leave settlement. While the instance is in `LeaveAnimating`, its update returns one `WaitForAnimationSettled` Command with its `id` and current transition generation. In any other state it changes nothing. |
| `RequestedFinish({ generation })`   | Finishes the current animation when the parent observes that it has ended. A `generation` from an older transition does not finish a newer one.                                                                                         |

### ViewInputs {#view-config}

Pass these fields to the instance's `view`, as in `model.animation.view({ ... })`. Spread the attribute groups the component passes to your callbacks unchanged, and wrap handler-bearing attributes you pass in with `childAttributes`. See [View input](/core/block#callback-dispatch-boundaries).

| Name          | Type                            | Default | Description                                                                                                                                        |
| ------------- | ------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `toView`      | `() => Html`                    | —       | Renders the content to animate in and out.                                                                                                         |
| `animateSize` | `boolean`                       | `false` | Animates height collapse/expand using CSS grid. When true, the element stays in the DOM with grid-template-rows transitioning between 0fr and 1fr. |
| `className`   | `string`                        | —       | CSS class for the animation wrapper.                                                                                                               |
| `attributes`  | `ReadonlyArray<ChildAttribute>` | —       | Additional attributes for the wrapper.                                                                                                             |
| `element`     | `Exclude<TagName, 'textarea'>`  | `'div'` | The HTML element for the wrapper. Textarea is excluded because the wrapper renders children.                                                       |

### OutMessage

Facts the component reports to its parent. Handle them by spreading the instance's `.on({ ... })` into the parent's update record. Variants without a handler are ignored.

| Name                    | Type         | Default | Description                                                                                                                                                                                                                                                        |
| ----------------------- | ------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `StartedLeaveAnimating` | `OutMessage` | —       | Emitted when the leave animation begins. Its `generation` identifies the leave. Send `RequestedWaitForLeaveSettlement()` for standard CSS settlement, or start a custom leave Command that reports this generation back through `RequestedFinish({ generation })`. |
| `TransitionedOut`       | `OutMessage` | —       | Emitted when the leave animation finishes. Use this to unmount content or update your Model.                                                                                                                                                                       |
