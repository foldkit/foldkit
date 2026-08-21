# Animation

## Overview

Animation coordinates CSS enter and leave phases with a state machine and data attributes. You dispatch `Showed` or `Hid`, Animation records each lifecycle phase in its Model, and your CSS styles those phases. The transitions stay visible in DevTools and can be tested through update without waiting for a browser animation.

Animation uses the [OutMessage](/core/submodel#surfacing-facts) pattern. The `foldOutMessage` of your [`Update.foldChild`](/core/submodel#fold-child) config handles `StartedLeaveAnimating` by providing a Command that detects settlement, then handles `TransitionedOut` when post-animation cleanup can begin. Dialog, Menu, Popover, Listbox, and Combobox use the same Submodel internally when `isAnimated` is true.

## Lifecycle Coordination {#why}

CSS can animate between two rendered styles, but an application still has to stage those styles across paints and keep a leaving element mounted until its animations finish. Animation coordinates three parts of that lifecycle.

First, an entering element renders with `data-closed`. Animation waits for paint before removing that attribute, so the browser sees the change and starts the CSS animation.

Second, browser animation settlement does not enter update on its own. `defaultLeaveCommand` waits for every transition and keyframe animation reported by the element's Web Animations API to settle, then returns `EndedAnimation`. Animation responds with `TransitionedOut`, which tells the parent that it can unmount content or perform other cleanup.

Third, `animateSize: true` supplies the nested CSS grid structure needed to animate content between collapsed and expanded rows without measuring its height in JavaScript. It keeps the hidden content mounted at zero height instead of removing it.

Use Animation directly when your own content needs the same lifecycle. Components such as Dialog, Menu, Popover, Listbox, and Combobox already provide it through their `isAnimated` option.

:::Info{label="See it in an app"}
Check out how Animation is wired up in a [real Foldkit app](https://github.com/foldkit/foldkit/blob/main/examples/ui-showcase/src/ui/view/animation.ts).
:::

## Examples

Send `Animation.Showed()` to start the enter animation and `Animation.Hid()` to start the leave animation. Style with Tailwind data-attribute selectors like `data-[closed]:opacity-0`.

::Demo{name="animation"}

::Snippet{name="uiAnimationBasic" label="animation example"}

## Lifecycle

Animation drives the enter phase to completion on its own. The leave phase hands control back to the parent halfway through so the parent can decide how settlement is detected. For example, Foldkit's [Dialog](/ui/dialog) just waits for CSS, while its [Popover](/ui/popover) races CSS against the anchor button scrolling off-screen. The asymmetry exists because leave detection varies by consumer, while enter detection does not.

```diagram
ENTER                                LEAVE
Animation drives completion          Parent detects settlement

Showed()                              Hid()
   |                                    |
   v                                    v
EnterStart                           LeaveStart
   | rAF x 2                            | rAF x 2
   v                                    v
EnterAnimating                       LeaveAnimating
   | EndedAnimation (internal)          +-> emits StartedLeaveAnimating
   v                                    |   parent supplies leave Command
 Idle                                   |
                                        |   Command dispatches
                                        |   EndedAnimation
                                        v
                                       Idle
                                        +-> emits TransitionedOut
                                            parent handles cleanup
```

The double-rAF timing (one frame to set the start state, another to trigger the animation) ensures browsers flush layout between phases so the CSS animation actually plays.

## Styling

Animation is headless. You style its lifecycle with CSS transitions or CSS keyframe animations, and the state machine advances after every animation returned by `element.getAnimations()` has settled. With `animateSize: true`, Animation also adds a fixed 200ms CSS grid-row transition and the wrappers it requires.

For CSS transitions, use data-attribute selectors like `data-[closed]:opacity-0 data-[closed]:scale-95` together with a `transition` property on the element. For CSS keyframe animations, apply an `animation` shorthand scoped to `data-[enter]` or `data-[leave]`. The state machine waits for every animation returned by the element's `getAnimations()` call to settle.

Leave animations must be finite. `animation-iteration-count: infinite` never fires `animationend`, which leaves the state machine in `LeaveAnimating` forever and the element in the DOM. Reserve infinite animations for decorative or ambient effects that don’t gate a leave phase.

The `animateSize` option uses CSS grid (`grid-template-rows: 0fr` → `1fr`) for smooth height animation without JavaScript measurement.

| Attribute         | Condition                                                                              |
| ----------------- | -------------------------------------------------------------------------------------- |
| `data-closed`     | Present during `EnterStart` and `LeaveAnimating`. Target this for hidden-state styles. |
| `data-enter`      | Present during the enter animation.                                                    |
| `data-leave`      | Present during the leave animation.                                                    |
| `data-transition` | Present during any animation phase.                                                    |

## API Reference

### InitConfig {#init-config}

Configuration object passed to `Animation.init()`.

| Name        | Type      | Default | Description                           |
| ----------- | --------- | ------- | ------------------------------------- |
| `id`        | `string`  | —       | Unique ID for the animation instance. |
| `isShowing` | `boolean` | `false` | Initial visibility state.             |

### ViewConfig {#view-config}

Configuration object passed to `Animation.view()`.

| Name          | Type                                | Default | Description                                                                                                                                        |
| ------------- | ----------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `model`       | `Animation.Model`                   | —       | The animation state from your parent Model.                                                                                                        |
| `content`     | `Html`                              | —       | The content to animate in and out.                                                                                                                 |
| `animateSize` | `boolean`                           | `false` | Animates height collapse/expand using CSS grid. When true, the element stays in the DOM with grid-template-rows transitioning between 0fr and 1fr. |
| `className`   | `string`                            | —       | CSS class for the animation wrapper.                                                                                                               |
| `attributes`  | `ReadonlyArray<Attribute<Message>>` | —       | Additional attributes for the wrapper.                                                                                                             |
| `element`     | `TagName`                           | `'div'` | The HTML element for the wrapper.                                                                                                                  |

### OutMessage

Messages emitted to the parent through the optional `outMessage` field. Fold the OutMessage in the `foldOutMessage` of your [`Update.foldChild`](/core/submodel#fold-child) config.

| Name                    | Type         | Default | Description                                                                                                                                                                     |
| ----------------------- | ------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `StartedLeaveAnimating` | `OutMessage` | —       | Emitted when the leave animation begins. Return Animation.defaultLeaveCommand(model) from the fold, lifted with the fold context's liftCommand, to detect animation settlement. |
| `TransitionedOut`       | `OutMessage` | —       | Emitted when the leave animation finishes. Use this to unmount content or update your Model.                                                                                    |
