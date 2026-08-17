# Animation

## Overview

Animation is a CSS animation lifecycle coordinator that manages enter/leave phases via a state machine and data attributes. If you're coming from imperative animation libraries (for example GSAP, Framer Motion, or `element.animate()`), it will feel inverted: those libraries let you say "do this now" and give you a callback when it's done, while Foldkit is declarative. You dispatch Messages describing what happened, Animation turns the lifecycle into a sequence of more Messages, and your update function reacts at each step. The payoff is that every animation state transition is in your Model, observable in DevTools, testable without a DOM, and can't run outside your update loop.

Concretely, Animation uses the [OutMessage](/core/submodel#surfacing-facts) pattern: the `foldOutMessage` of your [`Update.foldChild`](/core/submodel#fold-child) config handles `StartedLeaveAnimating` (to provide settlement detection) and `TransitionedOut` (to unmount content). It's used internally by Dialog, Menu, Popover, Listbox, and Combobox when `isAnimated` is true, and works with both CSS transitions and CSS keyframe animations.

## Why Does This Exist? {#why}

CSS animations only play when an element enters the DOM with one state and changes to another. If an element mounts with its final styles, the browser has no "before" state and nothing animates. Reliably coordinating enter and leave phases takes three pieces of machinery that are easy to get wrong.

First, enter animations need a closed state that sticks for one frame before being removed, so the browser commits it to the DOM and then sees a change. Animation handles this with a double-`requestAnimationFrame` sequence: one frame to apply `data-closed`, another to remove it and trigger the CSS animation.

Second, `transitionend` and `animationend` don't automatically flow into your update function. You could subscribe to them yourself, but that means wiring a subscription per element, filtering by selector, and managing its lifecycle alongside the state machine. Without that coordinator, there's no reliable way to know when a leave animation has finished, and therefore no way to reliably unmount content after it does. Animation emits `TransitionedOut` as the bridge: your update provides `defaultLeaveCommand`, it waits for the element’s animations to settle, and Animation tells you when the leave is complete.

Third, animating `height: auto` isn't possible with pure CSS: `auto` is not an animatable value, so height transitions normally require JavaScript DOM measurement. `animateSize: true` sidesteps this by wrapping content in a CSS grid that animates `grid-template-rows` from `0fr` to `1fr`. The structure works but requires specific DOM nesting that Animation provides for you.

Every component in the library that needs enter/leave animations (for example Dialog, Menu, Popover, Listbox, or Combobox) uses Animation internally rather than reinventing this coordination. If you need the same for your own content, Animation gives you the same machinery.

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
ENTER  (Animation drives to completion on its own)

         Showed()
            |
            ↓
   +-----------------+
   |   EnterStart    |
   +--------+--------+
            | rAF × 2
            ↓
   +-----------------+
   | EnterAnimating  |
   +--------+--------+
            | EndedAnimation (internal)
            ↓
   +-----------------+
   |      Idle       |
   +-----------------+


LEAVE  (Animation hands settlement detection to the parent)

         Hid()
            |
            ↓
   +-----------------+
   |   LeaveStart    |
   +--------+--------+
            | rAF × 2
            ↓
   +-----------------+  ← emits StartedLeaveAnimating
   | LeaveAnimating  |    parent supplies leave Command
   +--------+--------+
            | leave Command dispatches EndedAnimation
            ↓
   +-----------------+  ← emits TransitionedOut
   |      Idle       |    parent handles post-animation cleanup
   +-----------------+
```

The double-rAF timing (one frame to set the start state, another to trigger the animation) ensures browsers flush layout between phases so the CSS animation actually plays.

## Styling

Animation is headless. It only manages data attributes. You can style the lifecycle with either CSS transitions or CSS keyframe animations; the state machine advances once every animation on the element has settled.

For CSS transitions, use data-attribute selectors like `data-[closed]:opacity-0 data-[closed]:scale-95` together with a `transition` property on the element. For CSS keyframe animations, apply an `animation` shorthand scoped to `data-[enter]` or `data-[leave]`. The state machine waits for every animation on the element to settle, whether they fire `transitionend`, `animationend`, or both.

Leave animations must be finite. `animation-iteration-count: infinite` never fires `animationend`, which leaves the state machine in `LeaveAnimating` forever and the element in the DOM. Reserve infinite animations for decorative or ambient effects that don’t gate a leave phase.

The `animateSize` option uses CSS grid (`grid-template-rows: 0fr` → `1fr`) for smooth height animation without JavaScript measurement.

| Attribute         | Condition                                                                                 |
| ----------------- | ----------------------------------------------------------------------------------------- |
| `data-closed`     | Present at the start of enter and during leave. Target this for your hidden state styles. |
| `data-enter`      | Present during the enter animation.                                                       |
| `data-leave`      | Present during the leave animation.                                                       |
| `data-transition` | Present during any animation phase.                                                       |

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

Messages emitted to the parent through the third element of `[Model, Commands, Option<OutMessage>]`. Fold the OutMessage in the `foldOutMessage` of your [`Update.foldChild`](/core/submodel#fold-child) config.

| Name                    | Type         | Default | Description                                                                                                                                                                     |
| ----------------------- | ------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `StartedLeaveAnimating` | `OutMessage` | —       | Emitted when the leave animation begins. Return Animation.defaultLeaveCommand(model) from the fold, lifted with the fold context's liftCommand, to detect animation settlement. |
| `TransitionedOut`       | `OutMessage` | —       | Emitted when the leave animation finishes. Use this to unmount content or update your Model.                                                                                    |
