---
'foldkit': patch
---

Replace `requestAnimationFrame` with `Effect.suspend` in all DOM tasks (`focus`, `showModal`, `closeModal`, `clickElement`, `scrollIntoView`, `advanceFocus`) so they execute within the same browser task as the user gesture, fixing mobile input focus. Fix dialog backdrop not covering full viewport on iOS Safari during toolbar animations by adding `min-height: 100vh` and removing unnecessary `overflow: hidden`.
