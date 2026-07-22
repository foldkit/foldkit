---
'foldkit': minor
---

Add a `viewTransition` option to `makeApplication` and `makeElement`. When the predicate matches a render, the runtime performs that render inside `document.startViewTransition`, so route changes and other Model-driven updates can animate with the View Transitions API, including shared-element morphs via `viewTransitionName` styles. The predicate receives the Model and the Message that dirtied it and returns `false`, `true`, or `{ types }` to tag the transition for `:active-view-transition-type(...)` CSS scoping. Renders fall back to the plain synchronous path when the browser lacks the API, when `prefers-reduced-motion: reduce` is set, and for DevTools replay, crash, and initial renders.
