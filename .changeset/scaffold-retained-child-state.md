---
'create-foldkit-app': patch
'@foldkit/ui': minor
---

Document in the scaffold's `FOLDKIT.md` that reusable static Tailwind control recipes belong in the stylesheet's `@layer components`, with `clsx` reserved for conditional classes.

Track keyboard drag generations in DragAndDrop so a delayed move result cannot change or focus a restarted interaction. A `CompletedResolveKeyboardMove` Message constructed by hand in a test must carry the pending Command's `keyboardDragGeneration`; `DragAndDrop.test.resolveKeyboardMove` derives it from the pending Command.
