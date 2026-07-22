---
'foldkit': minor
---

`Story.Command.resolve` and `Scene.Command.resolve` now accept a bare name-keyed interruptible Command definition, the with-args `Command.Interruptible.define` shape that omits `toKey`. The definition overload already accepted the no-args and keyed with-args shapes, but the name-keyed shape was missing from its union, so resolving one by its definition failed to typecheck and forced a resolve-by-instance workaround. Runtime matching was name-only all along, so this closes a type-level gap.
