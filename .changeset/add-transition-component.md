---
'foldkit': minor
---

Add `Transition` UI component for coordinating CSS enter/leave animations. Manages the animation lifecycle via a state machine and data attributes (`data-closed`, `data-enter`, `data-leave`, `data-transition`), with double-rAF timing and Web Animations API completion detection. Sends a `TransitionedOut` OutMessage when the leave animation completes. Supports `animateSize` for smooth height animation via CSS grid (`grid-template-rows: 0fr → 1fr`).
