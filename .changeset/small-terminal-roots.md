---
'foldkit': minor
---

Add `Composition.assembleRoot` as an opt-in terminal application boundary for `Program.make`, `Program.makeElement`, and server rendering.

The root path keeps the same concrete graph validation and inferred root contracts as full Block assembly, but exposes only `owner`, `Model`, `Message`, `init`, `update`, and `operations`. Use ordinary `assembleBlock` when child binding, graph inspection, handler delegation, Layer replacement, or view tooling needs the full public Block surface.
