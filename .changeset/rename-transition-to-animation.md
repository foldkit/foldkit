---
'foldkit': minor
---

**Breaking**: Renamed `Ui.Transition` to `Ui.Animation` and expanded the contract to cover both CSS transitions and CSS keyframe animations.

The lifecycle coordinator previously filtered `element.getAnimations()` down to `CSSTransition` instances, so consumers styling enter/leave with `@keyframes` got no completion signal and the state machine hung in `LeaveAnimating` forever. `Task.waitForAnimationSettled` now resolves once every animation on the element has settled (CSS transitions and CSS keyframe animations alike).

Migration:

- `Ui.Transition` → `Ui.Animation`
- `Task.waitForTransitions` → `Task.waitForAnimationSettled`
- `EndedTransition` Message → `EndedAnimation`
- `WaitForTransitions` Command → `WaitForAnimationSettled`
- `AdvancedTransitionFrame` Message → `AdvancedAnimationFrame`
- Consumer submodel field `transition: Transition.Model` → `animation: Animation.Model`
- Consumer wrapper Message `GotTransitionMessage` → `GotAnimationMessage`
- Consumer racing Command `DetectMovementOrTransitionEnd` → `DetectMovementOrAnimationEnd`
- `./ui/transition` package export path → `./ui/animation`

State-machine names stay (they describe lifecycle phases, not CSS mechanisms): `TransitionState`, `transitionState`, `TransitionedOut`, and the `data-enter` / `data-leave` / `data-transition` / `data-closed` attributes.

Leave animations must be finite. `animation-iteration-count: infinite` never fires `animationend` and will hang the state machine in `LeaveAnimating`.

This also surfaces as a migration concern for existing consumers. A consumer whose animated element carried an unrelated infinite CSS keyframe animation (a spinner, a pulse, etc.) previously worked because only `CSSTransition` instances were awaited on leave. With the broadened contract, the infinite animation is now included in the settlement check. Either make the animation finite or move it to a descendant element so it isn't the animated target itself.
