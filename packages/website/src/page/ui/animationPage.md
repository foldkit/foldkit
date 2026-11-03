# Animation

## Overview

Animation coordinates CSS enter and leave phases with a state machine and data attributes. Bind `AnimationBlock` in the parent. Its Binding projects the child-owned `requestShow`, `requestHide`, and `requestToggle` operations into connected parent Steps. The generated methods send `RequestedShow`, `RequestedHide`, or `RequestedToggle` through Animation’s separate InMessage contract. Its InMessage handler applies the owned transition and returns Commands; local paint and settlement facts still enter update. Tests can drive both paths without waiting for browser animation.

Animation uses the [OutMessage](/core/block#surfacing-facts) pattern. The Binding’s selected `fold` policy handles `StartedLeaveAnimating` by calling the standard settlement operation or returning a custom Command. It handles `TransitionedOut` when post-animation cleanup can begin. Dialog, Menu, Popover, Listbox, and Combobox use the same Block internally when `isAnimated` is true.

## Lifecycle Coordination {#why}

CSS can animate between two rendered styles, but an application still has to stage those styles across paints and keep a leaving element mounted until its animations finish. Animation coordinates three parts of that lifecycle.

### Entering Content

First, an entering element renders with `data-closed`. Animation waits for paint before removing that attribute, so the browser sees the change and starts the CSS animation.

### Leaving Content

Second, browser animation settlement does not enter update on its own. Call the bound `requestWaitForLeaveSettlement()` operation from the `StartedLeaveAnimating` policy. Animation's `inMessageUpdate` returns a Command that waits for every transition and keyframe animation reported by the element's Web Animations API, then sends `EndedAnimation`. Animation responds with `TransitionedOut`, which tells the parent that it can unmount content or perform other cleanup.

### Animating Size

Third, `animateSize: true` supplies the nested CSS grid structure needed to animate content between collapsed and expanded rows without measuring its height in JavaScript. It keeps the hidden content mounted at zero height instead of removing it.

### When to Use Animation Directly

Use Animation directly when your own content needs the same lifecycle. Components such as Dialog, Menu, Popover, Listbox, and Combobox already provide it through their `isAnimated` option.

:::Info{label="See it in an app"}
Check out how Animation is wired up in a [real Foldkit app](https://github.com/foldkit/foldkit/blob/main/examples/ui-showcase/src/blocks/ui/view/animation.ts).
:::

## Examples

Call the Binding’s `requestShow()` operation to start the enter animation and `requestHide()` to start the leave animation. Style with Tailwind data-attribute selectors like `data-[closed]:opacity-0`.

::Demo{name="animation"}

::Snippet{name="uiAnimationBasic" label="Animation"}

## Lifecycle

### Enter and Leave Responsibilities

Animation drives the enter phase to completion on its own. The leave phase hands control back to the parent halfway through so the parent can decide how settlement is detected. For example, Foldkit's [Dialog](/ui/dialog) just waits for CSS, while its [Popover](/ui/popover) races CSS against the anchor button scrolling off-screen. The asymmetry exists because leave detection varies by consumer, while enter detection does not.

The `requestShow`, `requestHide`, and `requestToggle` methods apply `RequestedShow`, `RequestedHide`, and `RequestedToggle` InMessages respectively. Animation's `inMessageUpdate` decides which transition to start from its current Model.

```diagram
ENTER                                LEAVE
Animation drives completion          Parent detects settlement

requestShow()                         requestHide()
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

Say a user closes a panel while it is still sliding in. `requestHide` starts the leave, and the browser reverses the running transition. Reversing cancels the enter transition, so the Command waiting for the enter to settle resolves and returns `EndedAnimation` while Animation is already leaving.

#### Ignore Stale Settlement

Animation ignores that late result. Each time `requestShow` or `requestHide` starts an enter or leave transition, Animation increases `transitionGeneration` in its Model. Every paint and settlement Command reports the transition generation that scheduled it, and update ignores a result whose generation is no longer current. The leave keeps running until its own settlement result arrives. The same holds when `requestShow` interrupts a leave.

#### Build a Custom Leave Command

The standard `requestWaitForLeaveSettlement()` operation reads the current generation inside Animation's `inMessageUpdate`. A parent-owned custom Command gets the generation from `StartedLeaveAnimating` and returns it in its own completion Message. The parent handles that result with `AnimationBinding.requestFinish(generation)`:

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

### requestToggle

Call the bound `AnimationBinding.requestToggle()` operation to start the enter or leave lifecycle according to the child Model's `isShowing` value. It returns a connected parent Step that reads and writes the child Model through the Binding. Apply it to the contextual Model and return or compose its opaque result inside the registered Composition.

### InitConfig {#init-config}

Configuration passed to the Animation Binding's child initializer. Scoped tests pass the same config to `Story.init(...)` or `Scene.init(...)` and provide the component implementation Layer.

| Name        | Type      | Default | Description                           |
| ----------- | --------- | ------- | ------------------------------------- |
| `id`        | `string`  | —       | Unique ID for the animation instance. |
| `isShowing` | `boolean` | `false` | Initial visibility state.             |

### requestShow and requestHide

Call the bound `AnimationBinding.requestShow()` and `AnimationBinding.requestHide()` operations from the parent. Apply these connected parent Steps to the contextual Model and return or compose their opaque results inside the registered Composition. Checked execution produces the readable next Animation Model and any Commands. Parents invoke the generated Binding methods; Animation owns the InMessage handler and the local Messages that report browser and Command results.

### requestWaitForLeaveSettlement

Call the bound `AnimationBinding.requestWaitForLeaveSettlement()` operation from the `StartedLeaveAnimating` OutMessage policy to use Animation's standard leave settlement. The connected Step sends `RequestedWaitForLeaveSettlement` through Animation's `inMessageUpdate`. While the child is in `LeaveAnimating`, `inMessageUpdate` returns one `WaitForAnimationSettled` Command with the child's `id` and current transition generation. In any other state, the operation leaves the Model unchanged and returns no Command.

The standard policy does not import a child Command helper, read the child Model, or lift the result Message. A custom Command that returns `EndedAnimation` still uses the fold context's `liftCommand`. When a parent-owned Command reports completion through a parent Message, handle that Message with `AnimationBinding.requestFinish(generation)`.

### requestFinish

Call the Binding-projected `AnimationBinding.requestFinish(generation)` operation when a parent observes that the current animation has ended. This scalar adapter keeps its existing generation argument; the other parent methods are generated from InMessages. It returns a connected parent Step and preserves the Animation's generation check: a result from an older transition does not finish a newer one. A parent-owned Command reports its own completion Message; the parent handles that result by invoking this operation inside its Composition-authored update.

### ViewInputs {#view-config}

Pass the child Model as `model` and these fields as `viewInputs` to the Animation Binding's `embedView` method. The Binding supplies the canonical view, Message wrapper, and composition scope. Keep `toView` at the embedding view boundary so its handlers use the parent dispatcher. Use `childAttributes` for handler-bearing attribute inputs; see [Callback dispatch boundaries](/core/block#callback-dispatch-boundaries).

| Name          | Type                            | Default | Description                                                                                                                                        |
| ------------- | ------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `toView`      | `() => Html`                    | —       | Renders the content to animate in and out.                                                                                                         |
| `animateSize` | `boolean`                       | `false` | Animates height collapse/expand using CSS grid. When true, the element stays in the DOM with grid-template-rows transitioning between 0fr and 1fr. |
| `className`   | `string`                        | —       | CSS class for the animation wrapper.                                                                                                               |
| `attributes`  | `ReadonlyArray<ChildAttribute>` | —       | Additional attributes for the wrapper.                                                                                                             |
| `element`     | `Exclude<TagName, 'textarea'>`  | `'div'` | The HTML element for the wrapper. Textarea is excluded because the wrapper renders children.                                                       |

### OutMessage

Messages emitted to the parent through the optional `outMessage` field. Handle the OutMessage in the Binding’s selected `fold` policy.

| Name                    | Type         | Default | Description                                                                                                                                                                                                                                                   |
| ----------------------- | ------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `StartedLeaveAnimating` | `OutMessage` | —       | Emitted when the leave animation begins. Its `generation` identifies the leave. Call the bound `requestWaitForLeaveSettlement()` operation for standard CSS settlement. A custom leave Command returns `EndedAnimation({ generation })` with this generation. |
| `TransitionedOut`       | `OutMessage` | —       | Emitted when the leave animation finishes. Use this to unmount content or update your Model.                                                                                                                                                                  |
