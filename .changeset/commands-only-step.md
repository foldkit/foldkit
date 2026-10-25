---
'foldkit': minor
---

Add `Definition.makeCommandsStep(producer)` for reusable Steps that preserve the Model and produce Commands. The producer receives the current Model; use a zero-argument callback for fixed Commands. The helper checks result Messages against its owning Block and preserves Command Service requirements and child Binding registration evidence. Construction is passive, the producer runs when applied, and Runtime executes the returned Commands independently.

Use `makeStep` for a transition that also changes the Model or emits an OutMessage. Ordinary update handlers can return complete results directly.
