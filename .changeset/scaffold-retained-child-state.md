---
'create-foldkit-app': patch
'@foldkit/ui': minor
---

Explain child state retention separately from route rendering and Subscription activity in the scaffold's `FOLDKIT.md`. Document precise names for selectors, Message handlers, pure transitions, and conditional child initialization.

Place reusable static Tailwind control recipes in the stylesheet's component layer and reserve `clsx` for conditional classes.

Track keyboard drag generations so a delayed move result cannot change or focus a restarted interaction. Custom `ResolveKeyboardMove` handlers and manually constructed completion Messages must preserve `keyboardDragGeneration`; the public Story helper derives it from the pending Command.
