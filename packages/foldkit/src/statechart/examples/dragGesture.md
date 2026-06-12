# Drag Gesture Recognition

Code: `dragGesture.test.ts` (`Idle | Pressed | Dragging | Settling`, driven
by pointer events).

## The problem this solves

Pointer streams are adversarial. Real devices deliver `pointerup` with no
preceding `pointermove`, `pointercancel` mid-drag, moves from a second
pointer while the first is dragging, and presses that land during a drop
animation. Hand-written handlers accumulate implicit holes in the
state-by-event matrix: each `if` was written with one ordering in mind, and
the pathological orderings fall through to whichever branch happens to
match.

## What the machine buys

- Every cell of the matrix is a visible decision. The
  `decides every cell of the state and message matrix explicitly` test steps
  every sample state against every message and asserts exactly which pairs
  transition; everything else is observably `Ignored`. That test is only
  writable because transitions are enumerable data.
- Pointer identity is a guard, not an `if` inside a handler. Each guarded
  list checks `message.pointerId === state.pointerId` first, and because the
  lists have no `otherwise`, another pointer's events fall through to
  `Ignored` in every state. One loop in the test proves it for the whole
  machine.
- The threshold logic is a two-entry guard list that reads like the spec:
  cross the threshold and become `Dragging`, same pointer below the
  threshold stays `Pressed` (an identity self-edge, `state => state`),
  anything else is ignored.
- Interruptions are first-class edges: `pointercancel` during a drag settles
  back to the origin, and a new press during `Settling` cuts the animation
  short. Both are single table entries rather than special cases threaded
  through handlers.

## Honest limits

- This is a single-pointer machine. Real multi-touch (pinch, two-finger
  scroll) is parallel state, which a flat statechart models badly; that is
  the hierarchy/parallelism gap noted in the spike notes.
- The machine recognizes the gesture but does not render it. The actual
  drag visuals still need view code reading `Dragging`'s coordinates, and
  the settle animation needs a Subscription or Mount gated on the
  `Settling` tag to dispatch `CompletedSettle`.
- Foldkit UI already ships a drag-and-drop module; this example is about the
  recognition pattern, not a replacement for it.
